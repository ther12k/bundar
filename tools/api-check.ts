/**
 * api:check (GH-025): fails closed when the committed API snapshot
 * (artifacts/api/core.md, written by api:report) no longer matches the
 * live @bundar/core public surface. Public-surface changes must be
 * deliberate: re-run `bun run api:report`, review the diff, and commit the
 * snapshot together with the change.
 */
import { join } from "node:path";
import { renderCoreApiReport } from "./api-report";

const snapshotPath = join(import.meta.dir, "../artifacts/api/core.md");
const { report, runtimeCount, typeCount } = await renderCoreApiReport();
const committed = await Bun.file(snapshotPath).text();

if (committed === report) {
  console.log(
    `api:check: artifacts/api/core.md matches the public surface (${runtimeCount} runtime + ${typeCount} type exports)`,
  );
  process.exit(0);
}

const committedLines = committed.split("\n");
const actualLines = report.split("\n");
let index = 0;
while (
  index < committedLines.length &&
  index < actualLines.length &&
  committedLines[index] === actualLines[index]
)
  index += 1;
console.error(
  `api:check: artifacts/api/core.md is stale (first divergence at line ${index + 1}: committed ${JSON.stringify(committedLines[index])} vs actual ${JSON.stringify(actualLines[index])})`,
);
console.error(
  "api:check: re-run `bun run api:report`, review the snapshot diff, and commit it with the surface change",
);
process.exit(1);
