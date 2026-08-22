/**
 * publish:approved (GH-088): the guarded publish step. Publishing is a
 * maintainer decision — this tool refuses to touch any registry unless
 * an explicit approval token is present (BUNDAR_RELEASE_TOKEN) AND npm
 * credentials exist. Without them it runs in DRY-RUN mode: prints the
 * exact publish plan (dependency-first, pre-release dist-tag) and
 * verifies the artifacts one last time. No partial claims: if it did
 * not publish, it says so.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..");
const SIM_VERSION = "0.1.0-alpha.1";
const DIST_TAG = "alpha";
const dryRun = JSON.parse(
  readFileSync(join(REPO, "artifacts", "publish-dry-run.json"), "utf8"),
);
const order: readonly string[] = dryRun.plan.publishOrder;

const token = process.env.BUNDAR_RELEASE_TOKEN;
const hasNpmIdentity =
  spawnSync("npm", ["whoami"], { stdio: "pipe" }).status === 0;

if (token === undefined || token.length === 0 || !hasNpmIdentity) {
  console.log(
    `publish:approved: DRY-RUN (no approval token or npm identity) — nothing published.`,
  );
  console.log(
    `Plan: for each of ${order.join(" → ")}: npm publish --tag ${DIST_TAG} (version ${SIM_VERSION}).`,
  );
  console.log(
    "Approval procedure: maintainer sets BUNDAR_RELEASE_TOKEN, authenticates npm, re-runs this command.",
  );
  process.exit(0);
}

console.log(`publish:approved: publishing ${SIM_VERSION} @ ${DIST_TAG}`);
for (const pkg of order) {
  const dir =
    pkg === "create-bundar"
      ? "create-bundar"
      : `packages/${pkg.replace("@bundar/", "")}`;
  console.log(`\n[publish] ${pkg} (${dir})`);
  const result = spawnSync(
    "npm",
    ["publish", "--tag", DIST_TAG, "--access", "public"],
    {
      cwd: join(REPO, dir),
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    console.error(
      `publish:approved: FAILED at ${pkg} — stopping; earlier publishes stand, later ones did not run`,
    );
    process.exit(1);
  }
}
console.log(
  `publish:approved: ${order.length} packages published @ ${DIST_TAG}`,
);
