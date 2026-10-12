import {
  start,
  load,
  publicLink,
  finding,
  report,
  section,
  mapLimit,
  assertHtml,
} from "./common.js";
import { providerJson } from "./provider.js";
export function perfSummary(data) {
  const lh = data.lighthouseResult;
  const lab = lh
    ? {
        score: lh.categories?.performance?.score ?? null,
        lcp: lh.audits?.["largest-contentful-paint"]?.numericValue ?? null,
        cls: lh.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
        tbt: lh.audits?.["total-blocking-time"]?.numericValue ?? null,
        warnings: lh.runWarnings ?? [],
      }
    : null;
  const field = data.loadingExperience?.metrics;
  const metrics = field
    ? {
        lcp: field.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
        inp: field.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
        cls:
          field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
            ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
            : null,
      }
    : null;
  return {
    lab,
    field:
      metrics && Object.values(metrics).some((v) => v !== null)
        ? metrics
        : null,
  };
}
export async function auditSite(input, options = {}) {
  const { target, started, response, fetcher, signal } = await start(
    input,
    options,
  );
  assertHtml(response);
  const findings = [];
  const $ = load(response.body);
  const rows = [];
  rows.push(
    {
      etiket: "HTML indirilen (açılmış) boyut",
      deger: `${response.bytes} bayt`,
    },
    {
      etiket: "Cache-Control",
      deger: response.headers["cache-control"] || "Başlık yok",
    },
    {
      etiket: "İçerik kodlaması",
      deger: response.headers["content-encoding"] || "Başlık yok",
    },
    {
      etiket: "ETag / Last-Modified",
      deger:
        response.headers.etag ||
        response.headers["last-modified"] ||
        "Başlık yok",
    },
  );
  const urls = [
    ...new Set(
      $("img[src]")
        .toArray()
        .map((el) => publicLink($(el).attr("src"), response.url)?.href)
        .filter(Boolean),
    ),
  ].slice(0, 8);
  const images = await mapLimit(urls, async (url) => {
    const a = await fetcher(url, { signal, maxBytes: 2000000 });
    if (a.ok && a.result.bytes > 250000)
      findings.push(
        finding(
          "PERF-IMAGE",
          "Büyük görsel dosyası",
          url,
          `${a.result.bytes} bayt (açılmış gövde)`,
          "Boyutu kullanım yerine göre küçültün, uygun biçim ve srcset kullanın.",
        ),
      );
    return {
      etiket: "Görsel",
      url,
      deger: a.ok
        ? `${a.result.bytes} bayt · HTTP ${a.result.status} · Cache-Control: ${a.result.headers["cache-control"] || "yok"}`
        : a.error,
    };
  });
  // Google PSI anahtarsız kullanım destekler; kota hataları açıkça ölçülemedi gösterilir.
  let summary = { lab: null, field: null };
  let psiError = "";
  const provider = options.provider ?? providerJson;
  try {
    const endpoint = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    endpoint.searchParams.set("url", response.url);
    endpoint.searchParams.set(
      "strategy",
      options.strategy === "desktop" ? "desktop" : "mobile",
    );
    endpoint.searchParams.set("category", "performance");
    if (process.env.PAGESPEED_API_KEY)
      endpoint.searchParams.set("key", process.env.PAGESPEED_API_KEY);
    summary = perfSummary(await provider(endpoint, { signal, timeout: 25000 }));
  } catch {
    psiError =
      "PageSpeed ölçülemedi: kota, ağ veya zaman aşımı. HTTP gözlemleri aşağıda korunmuştur.";
  }
  let crux = summary.field;
  let cruxScope = "PSI URL düzeyi";
  if (process.env.CRUX_API_KEY)
    try {
      const endpoint = new URL(
        "https://chromeuxreport.googleapis.com/v1/records:queryRecord",
      );
      endpoint.searchParams.set("key", process.env.CRUX_API_KEY);
      const data = await provider(endpoint, {
        method: "POST",
        body: {
          url: response.url,
          formFactor: options.strategy === "desktop" ? "DESKTOP" : "PHONE",
          metrics: [
            "largest_contentful_paint",
            "interaction_to_next_paint",
            "cumulative_layout_shift",
          ],
        },
        signal,
      });
      const m = data.record?.metrics;
      crux = m
        ? {
            lcp: m.largest_contentful_paint?.percentiles?.p75 ?? null,
            inp: m.interaction_to_next_paint?.percentiles?.p75 ?? null,
            cls: m.cumulative_layout_shift?.percentiles?.p75 ?? null,
          }
        : null;
      cruxScope = `CrUX URL düzeyi · dönem: ${JSON.stringify(data.record?.collectionPeriod ?? {})}`;
    } catch {
      /* PSI varsa korunur; yoksa veri yok. */
    }
  const val = (v, unit = "") =>
    v === null || v === undefined ? "Ölçülemedi" : `${v}${unit}`;
  const lab = summary.lab;
  if (lab?.lcp > 2500)
    findings.push(
      finding(
        "PERF-LAB-LCP",
        "Laboratuvar LCP yüksek",
        response.url,
        `${lab.lcp} ms`,
        "Ana görsel, sunucu yanıtı ve render engelleyen kaynakları inceleyin; gerçek kullanıcı verisiyle birlikte değerlendirin.",
      ),
    );
  if (lab?.cls > 0.1)
    findings.push(
      finding(
        "PERF-LAB-CLS",
        "Laboratuvarda yerleşim kayması",
        response.url,
        String(lab.cls),
        "Görsel boyutlarını ayırın; geç eklenen içerik ve font davranışını inceleyin.",
      ),
    );
  const sections = [
    section(
      "Laboratuvar · Lighthouse",
      lab
        ? [
            {
              etiket: "Cihaz",
              deger: options.strategy === "desktop" ? "Masaüstü" : "Mobil",
            },
            {
              etiket: "Performans puanı",
              deger: val(
                lab.score === null ? null : Math.round(lab.score * 100),
              ),
            },
            { etiket: "LCP", deger: val(lab.lcp, " ms") },
            { etiket: "CLS", deger: val(lab.cls) },
            { etiket: "TBT (INP değildir)", deger: val(lab.tbt, " ms") },
            ...lab.warnings.map((w) => ({ etiket: "Ölçüm uyarısı", deger: w })),
          ]
        : [
            {
              etiket: "Durum",
              deger: psiError || "Laboratuvar sonucu dönmedi.",
            },
          ],
    ),
    section(
      "Gerçek kullanıcılar · Core Web Vitals",
      crux
        ? [
            { etiket: "Kapsam", deger: cruxScope },
            { etiket: "LCP p75", deger: val(crux.lcp, " ms") },
            { etiket: "INP p75", deger: val(crux.inp, " ms") },
            { etiket: "CLS p75", deger: val(crux.cls) },
          ]
        : [
            {
              etiket: "Durum",
              deger:
                "URL için gerçek kullanıcı verisi alınamadı. Başarılı veya başarısız sayılmaz.",
            },
          ],
    ),
    section("HTTP ve görseller", [...rows, ...images]),
  ];
  return report("WebPERFrobot", target, started, findings, sections, [
    "Laboratuvar puanı Core Web Vitals sonucu değildir; TBT, INP yerine geçmez.",
    "Gerçek kullanıcı verisi son ölçüm döneminin p75 değeridir; yeni veya az ziyaret edilen sitelerde bulunmayabilir.",
    "İlk sekiz img src incelenir; srcset, CSS arka planları ve dinamik kaynakların tamamı taranmaz.",
    "Gövde boyutu ağdaki sıkıştırılmış transfer boyutu değildir. Önbellek başlıkları bağlama göre değerlendirilmelidir.",
    "Hedef URL performans ölçümü için Google'a iletilir. Ücretsiz kullanım sağlayıcı kotasına tabidir.",
  ]);
}
