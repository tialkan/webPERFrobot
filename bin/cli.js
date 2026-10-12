#!/usr/bin/env node
import { readFile, appendFile } from "node:fs/promises";
import { auditSite } from "../src/audit.js";
import { reportToMarkdown } from "../src/report.js";
const args = process.argv.slice(2);
if (!args[0] || args.includes("--help")) {
  console.log(
    "Kullanım: node bin/cli.js https://ornek.com [--markdown] [--expected SURUM] [--question SORU] [--response-file DOSYA] [--watch SANİYE --output rapor.jsonl]",
  );
  process.exit(args[0] ? 0 : 1);
}
const value = (flag) => args[args.indexOf(flag) + 1];
const options = {};
if (args.includes("--expected")) options.expectedVersion = value("--expected");
if (args.includes("--question")) options.question = value("--question");
if (args.includes("--response-file"))
  options.responseText = await readFile(value("--response-file"), "utf8");
if (
  args.includes("--watch") &&
  (!args.includes("--output") ||
    Number(value("--watch")) < 60 ||
    !Number.isFinite(Number(value("--watch"))))
)
  throw new Error("İzleme için --output ve en az 60 saniye gerekli.");
if (args.includes("--watch") && true)
  throw new Error(
    "İzleme yalnız WebUProbot içindir; WEBUP_WATCH_ENABLED=1 ile açın.",
  );
try {
  do {
    const report = await auditSite(args[0], options);
    if (args.includes("--output"))
      await appendFile(value("--output"), JSON.stringify(report) + "\n", {
        mode: 0o600,
      });
    console.log(
      args.includes("--markdown")
        ? reportToMarkdown(report)
        : JSON.stringify(report, null, 2),
    );
    if (!args.includes("--watch")) break;
    await new Promise((resolve) =>
      setTimeout(resolve, Number(value("--watch")) * 1000),
    );
  } while (true);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
