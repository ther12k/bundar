import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..", "..");
const lanes = ["htmx2", "htmx4"] as const;
const outputDirectory = join(repositoryRoot, "evidence", "gh-008");
await mkdir(outputDirectory, { recursive: true });

const reports = await Promise.all(
  lanes.map(async (lane) =>
    JSON.parse(
      await readFile(
        join(repositoryRoot, "output", "playwright", lane, "report.json"),
        "utf8",
      ),
    ),
  ),
);

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  disclaimer:
    "Local browser conformance evidence only. htmx4 is beta/experimental and this report makes no htmx4 GA compatibility claim.",
  browser: "Chrome for Testing 152.0.7977.8 / Playwright Chromium 1237",
  lanes: reports,
};
await writeFile(
  join(outputDirectory, "report.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(
  `browser:report: ${reports.length} lanes recorded in evidence/gh-008/report.json`,
);
