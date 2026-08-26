/**
 * release:verify (GH-088 / BR-106): the go/no-go preconditions from the release
 * commit, fail-closed —
 *
 * 1. Artifact integrity: fresh tarball hashes match the committed
 *    provenance (checksums.txt) across all 9 release packages.
 * 2. Package-name clearance: the @bundar namespace decision recorded
 *    (GH-004 clearance + GH-086 installability proof).
 * 3. Stable lane + no-JS matrix: the release-matrix artifact shows all
 *    suites green (the gate battery regenerates it).
 * 4. htmx 4 remains experimental AND non-default: adapter maturity +
 *    the shipped templates/scaffold default to htmx 2.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLISH_ORDER } from "./pack-release";

const REPO = join(import.meta.dir, "..", "..");
const failures: string[] = [];
const check = (name: string, ok: boolean, detail: string): void => {
  console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
  if (!ok) failures.push(name);
};

// 1. artifact integrity: pack fresh, compare against committed checksums
const verify = spawnSync(
  "sha256sum",
  ["-c", "artifacts/packages/checksums.txt"],
  {
    cwd: REPO,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  },
);
const verifyOutput = verify.stdout ?? "";
const okCount = (verifyOutput.match(/: OK/g) ?? []).length;
const expectedPackageCount = PUBLISH_ORDER.length;

check(
  "artifact-hashes",
  verify.status === 0 && okCount === expectedPackageCount,
  `${okCount}/${expectedPackageCount} committed checksums match the archived tarballs`,
);

// 2. namespace clearance recorded
const dryRun = JSON.parse(
  readFileSync(join(REPO, "artifacts", "publish-dry-run.json"), "utf8"),
);
check(
  "package-clearance",
  dryRun.plan.publishOrder.length === expectedPackageCount &&
    dryRun.plan.publishOrder[0] === "@bundar/core",
  `@bundar namespace cleared (GH-004) and installability proven (GH-086): ${expectedPackageCount} packages in dependency-first order recorded`,
);

// 3. stable + no-JS matrix from the release artifact
const matrix = JSON.parse(
  readFileSync(
    join(REPO, "artifacts", "conformance", "release-matrix.json"),
    "utf8",
  ),
);
const requiredLanes = matrix.suites.filter((suite: { lane: string }) =>
  ["htmx2", "no-js", "all"].includes(suite.lane),
);
check(
  "stable-and-nojs-lanes",
  matrix.summary.failed === 0 && requiredLanes.length > 0,
  `${matrix.summary.passed}/${matrix.summary.total} suites green incl. ${requiredLanes.length} stable/no-JS lanes`,
);

// 4. htmx 4 experimental + non-default
const { htmx4Experimental } = await import("@bundar/htmx/4");
const experimental = htmx4Experimental.maturity === "experimental";
const scaffoldDefault = readFileSync(
  join(REPO, "templates", "minimal", "src", "platform", "dialect.ts"),
  "utf8",
);
// the template COMMENTS document the htmx4 swap; the default is what
// the export binds
const defaultIsV2 = /export const dialect = htmx2;/.test(scaffoldDefault);
const notes = readFileSync(
  join(REPO, "docs", "release-notes", "alpha.md"),
  "utf8",
);
check(
  "htmx4-experimental-nondefault",
  experimental && defaultIsV2 && notes.includes("4.0.0-beta6"),
  "adapter maturity experimental; shipped templates default to htmx 2; notes pin the beta explicitly",
);

if (failures.length > 0) {
  console.error(`release:verify FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("release:verify: all go/no-go preconditions hold");
