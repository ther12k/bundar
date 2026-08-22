/**
 * JSX snapshot regeneration (GH-036).
 *
 * Review policy: regeneration REFUSES to run without --reviewed-by. The
 * reviewer name, version bump, and timestamp land in the committed file, so
 * a snapshot change is always attributable to a deliberate review — blind
 * updates are structurally impossible.
 *
 *   bun run snapshots:jsx -- --regenerate --reviewed-by "name" [--reason "..."]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SNAPSHOT_PATH = join(
  import.meta.dir,
  "../packages/jsx/test/conformance/snapshots.json",
);

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? (args[index + 1] ?? "") : undefined;
};

if (!args.includes("--regenerate")) {
  console.error(
    "snapshots:jsx: pass --regenerate to rewrite the conformance corpus (requires --reviewed-by)",
  );
  process.exit(2);
}
const reviewedBy = flag("--reviewed-by");
if (reviewedBy === undefined || reviewedBy.length === 0) {
  console.error(
    "snapshots:jsx: --reviewed-by <name> is required — snapshot changes must carry a review trail",
  );
  process.exit(2);
}

// The fixture builder is shared with the test through a tiny dynamic import
// of the test module's exported builder (kept in the test file so the corpus
// has exactly one definition site).
const fixtureModule =
  await import("../packages/jsx/test/conformance/snapshot-cases");
const cases: Record<string, string> = {};
for (const [name, value] of Object.entries(fixtureModule.buildCases())) {
  cases[name] = await Promise.resolve(value);
}

let previous = { snapshotVersion: 0 };
try {
  previous = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as {
    snapshotVersion: number;
  };
} catch {
  // first generation — version starts at 1
}
const sorted: Record<string, string> = {};
for (const name of Object.keys(cases).sort()) sorted[name] = cases[name]!;

writeFileSync(
  SNAPSHOT_PATH,
  `${JSON.stringify(
    {
      snapshotVersion: previous.snapshotVersion + 1,
      reviewedBy,
      regeneratedAt: new Date().toISOString(),
      cases: sorted,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `snapshots:jsx: regenerated ${Object.keys(cases).length} cases (version ${previous.snapshotVersion + 1}, reviewed by ${reviewedBy})`,
);
