export async function providerJson(url, options = {}) {
  const allowed = new Set([
    "www.googleapis.com",
    "chromeuxreport.googleapis.com",
    "api.perplexity.ai",
  ]);
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== "https:" ||
    !allowed.has(endpoint.hostname) ||
    endpoint.username ||
    endpoint.password
  )
    throw new Error("Sağlayıcı adresi geçersiz.");
  const timeout = AbortSignal.timeout(options.timeout ?? 10000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;
  const response = await fetch(endpoint, {
    method: options.method ?? "GET",
    redirect: "error",
    signal,
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Sağlayıcı HTTP ${response.status}`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 8000000) {
      await reader.cancel();
      throw new Error("Sağlayıcı yanıt sınırı");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
