import { assertPublicUrl, guvenliFetch } from "./security.js";
export async function safeFetch(input, options = {}) {
  let url = await assertPublicUrl(input);
  const chain = [];
  const signal = options.signal
    ? AbortSignal.any([
        options.signal,
        AbortSignal.timeout(options.timeout ?? 7000),
      ])
    : AbortSignal.timeout(options.timeout ?? 7000);
  for (let hop = 0; hop <= 5; hop++) {
    await assertPublicUrl(url);
    signal.throwIfAborted();
    const response = await (options.transport ?? guvenliFetch)(url, {
      method: options.method ?? "GET",
      redirect: "manual",
      signal,
      headers: {
        "user-agent": "TezAtlasRobot/0.1 (+https://tezatlas.com)",
        accept: "*/*",
      },
    });
    chain.push({ url: url.href, status: response.status });
    if (
      options.followRedirects !== false &&
      [301, 302, 303, 307, 308].includes(response.status) &&
      response.headers.get("location")
    ) {
      await response.body?.cancel();
      if (hop === 5) throw new Error("Yönlendirme sınırı aşıldı.");
      url = new URL(response.headers.get("location"), url);
      continue;
    }
    const limit = options.maxBytes ?? 1500000;
    const reader = response.body?.getReader();
    const chunks = [];
    let bytes = 0;
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > limit) {
          await reader.cancel();
          throw new Error("Yanıt boyut sınırını aşıyor.");
        }
        chunks.push(value);
      }
    const buffer = Buffer.concat(chunks);
    const headers = Object.fromEntries(response.headers.entries());
    const cookies = (response.headers.getSetCookie?.() ?? []).map((cookie) =>
      cookie.replace(/^([^=;]+)=[^;]*/, "$1=[gizli]"),
    );
    delete headers["set-cookie"];
    return {
      url: url.href,
      status: response.status,
      headers,
      cookies,
      body: buffer.toString("utf8"),
      buffer,
      bytes,
      chain,
    };
  }
}
export async function tryFetch(url, options = {}) {
  try {
    return { ok: true, result: await safeFetch(url, options) };
  } catch (error) {
    return {
      ok: false,
      error:
        /özel|Yerel|port|Kullanıcı|HTTP|adres|Alan adı|Yanıt|Yönlendirme/.test(
          error.message,
        )
          ? error.message
          : "Ağ, TLS veya zaman aşımı nedeniyle doğrulanamadı.",
    };
  }
}
