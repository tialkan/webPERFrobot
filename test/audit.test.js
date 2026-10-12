import test from "node:test";
import assert from "node:assert/strict";
const response = (
  body = "<html><body>Test</body></html>",
  status = 200,
  url = "https://example.com/",
  headers = {},
) => ({
  ok: true,
  result: {
    url,
    status,
    headers: { "content-type": "text/html", ...headers },
    body,
    bytes: Buffer.byteLength(body),
    cookies: [],
    chain: [{ url, status }],
  },
});
import { auditSite, perfSummary } from "../src/audit.js";
test("TBT is not INP and absent CrUX does not pass", () => {
  const r = perfSummary({
    lighthouseResult: {
      categories: { performance: { score: 0.9 } },
      audits: { "total-blocking-time": { numericValue: 12 } },
    },
  });
  assert.equal(r.lab.tbt, 12);
  assert.equal(r.field, null);
  assert.equal(r.lab.inp, undefined);
  assert.equal(perfSummary({ loadingExperience: { metrics: {} } }).field, null);
});
test("provider failure preserves HTTP observations", async () => {
  const r = await auditSite("example.com", {
    fetcher: async () => response(),
    provider: async () => {
      throw new Error("quota");
    },
  });
  assert.match(r.bolumler[0].satirlar[0].deger, /ölçülemedi/);
  assert.equal(
    r.bolumler[2].satirlar[0].etiket,
    "HTML indirilen (açılmış) boyut",
  );
});
