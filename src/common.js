import { load } from "cheerio";
import { normalizeTarget } from "./security.js";
import { tryFetch } from "./net.js";
export { load, normalizeTarget, tryFetch };
export const squeeze = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
export function publicLink(value, base) {
  try {
    const url = new URL(value, base);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url;
  } catch {
    return null;
  }
}
export function document(response) {
  const $ = load(response.body);
  $("script,style,noscript,template").remove();
  return { $, text: squeeze($("body").text()) };
}
export function finding(kod, baslik, url, bulunan, cozum, seviye = "orta") {
  return {
    kod,
    baslik,
    seviye,
    kanit: { url, bulunan: squeeze(bulunan).slice(0, 1500) },
    cozum,
  };
}
export function report(
  arac,
  target,
  started,
  bulgular,
  bolumler,
  sinirlar,
  pages = 1,
) {
  return {
    arac,
    surum: "0.1.0",
    olusturuldu: new Date().toISOString(),
    hedef: { girilen: target.href },
    ozet: {
      sureMs: Date.now() - started,
      incelenenSayfa: pages,
      bulgu: bulgular.length,
      bolum: bolumler.length,
    },
    bulgular,
    bolumler,
    sinirlar,
  };
}
export function section(baslik, satirlar) {
  return { baslik, satirlar };
}
export async function start(input, options = {}) {
  const target = normalizeTarget(input);
  const started = Date.now();
  const fetcher = options.fetcher ?? tryFetch;
  const signal = options.signal ?? AbortSignal.timeout(45000);
  const attempt = await fetcher(target.href, { signal });
  if (!attempt.ok) throw new Error(attempt.error);
  return { target, started, response: attempt.result, fetcher, signal };
}
export async function mapLimit(items, fn, limit = 3) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index], index);
      }
    }),
  );
  return results;
}
export function assertHtml(response) {
  if (
    !/text\/html|application\/xhtml/i.test(
      response.headers["content-type"] ?? "",
    )
  )
    throw new Error("Hedef HTML sayfası olmalı.");
}
