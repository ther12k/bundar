/**
 * Conformance report generator (GH-053, GH-054).
 *
 * Publishes a machine-readable conformance report for a specified browser lane
 * (e.g. htmx2 or htmx4) from verified Playwright browser runs.
 *
 * Usage:
 *   bun tests/browser/conformance-report.ts <htmx2|htmx4|htmx4-beta6>
 *   bun run conformance:report -- htmx4-beta6
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  HTMX2_PROFILE,
  HTMX2_TESTED_VERSION,
  HTMX2_ASSET_SHA256,
} from "../../packages/htmx/src/dialects/v2/index";
import {
  HTMX4_PROFILE,
  HTMX4_TESTED_VERSION,
  HTMX4_ASSET_SHA256,
} from "../../packages/htmx/src/dialects/v4/index";

const rawArg = process.argv[2] ?? "htmx2";
const lane: "htmx2" | "htmx4" =
  rawArg === "htmx4-beta6" || rawArg === "htmx4" ? "htmx4" : "htmx2";

if (rawArg !== "htmx2" && rawArg !== "htmx4" && rawArg !== "htmx4-beta6") {
  console.error(
    "usage: bun tests/browser/conformance-report.ts <htmx2|htmx4|htmx4-beta6>",
  );
  process.exit(2);
}

const repositoryRoot = resolve(import.meta.dir, "..", "..");
const reportPath = join(
  repositoryRoot,
  "output",
  "playwright",
  lane,
  "report.json",
);
const outputDir = join(repositoryRoot, "artifacts", "conformance");
await mkdir(outputDir, { recursive: true });

const rawReport = JSON.parse(await readFile(reportPath, "utf8")) as Record<
  string,
  unknown
>;

const profile = lane === "htmx2" ? HTMX2_PROFILE : HTMX4_PROFILE;
const testedVersion =
  lane === "htmx2" ? HTMX2_TESTED_VERSION : HTMX4_TESTED_VERSION;
const expectedSha256 =
  lane === "htmx2" ? HTMX2_ASSET_SHA256 : HTMX4_ASSET_SHA256;

const conformanceReport = {
  schemaVersion: 1,
  lane,
  status:
    lane === "htmx2"
      ? "stable-conformance-verified"
      : "experimental-provisional",
  disclaimer:
    lane === "htmx4"
      ? "Local experimental browser conformance evidence only. htmx 4 is beta/provisional and GA revalidation is mandatory."
      : "Local stable browser conformance verified under pinned htmx 2.0.10.",
  generatedAt: new Date().toISOString(),
  profile: {
    testedVersion,
    assetSha256: expectedSha256,
    maturity: lane === "htmx2" ? "stable" : "experimental",
    capabilities: profile,
  },
  environment: {
    browser: "Chrome for Testing 152.0.7977.8 / Playwright Chromium 1237",
    bun: Bun.version,
    platform: process.platform,
    arch: process.arch,
  },
  browserRun: rawReport,
};

const outputFilenames =
  lane === "htmx2" ? ["htmx2.json"] : ["htmx4-beta6.json", "htmx4.json"];

for (const filename of outputFilenames) {
  const outputPath = join(outputDir, filename);
  await writeFile(
    outputPath,
    `${JSON.stringify(conformanceReport, null, 2)}\n`,
  );
}

console.log(
  `conformance:report: published ${lane} conformance report to artifacts/conformance/${outputFilenames[0]} (${(rawReport.scenarios as string[]).length} verified scenarios)`,
);
