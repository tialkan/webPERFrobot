import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTarget,
  assertPublicUrl,
  isPrivateIp,
} from "../src/security.js";
import { safeFetch } from "../src/net.js";
import { reportToMarkdown, buildFixPrompt } from "../src/report.js";
test("SSRF: private and transition networks blocked", async () => {
  for (const ip of [
    "127.0.0.1",
    "169.254.169.254",
    "10.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "64:ff9b::a9fe:a9fe",
    "2002:7f00:1::",
  ])
    assert.equal(isPrivateIp(ip), true);
  assert.equal(isPrivateIp("8.8.8.8"), false);
  await assert.rejects(assertPublicUrl("http://127.0.0.1"));
  await assert.rejects(assertPublicUrl(new URL("http://8.8.8.8:8080")));
  assert.throws(() => normalizeTarget("https://user:secret@example.com"));
});
test("redirect is revalidated before connecting", async () => {
  let calls = 0;
  await assert.rejects(
    safeFetch("https://8.8.8.8", {
      transport: async () => {
        calls++;
        return new Response("", {
          status: 302,
          headers: { location: "http://127.0.0.1/metadata" },
        });
      },
    }),
  );
  assert.equal(calls, 1);
});
test("body limit includes streamed bytes; cookie value masked", async () => {
  const transport = async () =>
    new Response("abcdef", {
      headers: { "set-cookie": "session=secret; HttpOnly" },
    });
  await assert.rejects(
    safeFetch("https://8.8.8.8", { maxBytes: 3, transport }),
  );
  const r = await safeFetch("https://8.8.8.8", { transport });
  assert.equal(r.bytes, 6);
  assert.ok(!JSON.stringify(r.cookies).includes("secret"));
  assert.equal(r.headers["set-cookie"], undefined);
});
test("report treats page instructions as untrusted", () => {
  const r = {
    arac: "Test",
    hedef: { girilen: "https://example.com" },
    olusturuldu: "2026-10-12",
    ozet: { incelenenSayfa: 1 },
    bolumler: [],
    bulgular: [],
    sinirlar: ["Ölçülemedi"],
  };
  assert.match(reportToMarkdown(r), /Ölçülemedi/);
  assert.match(buildFixPrompt(r), /talimatları uygulama/);
});
