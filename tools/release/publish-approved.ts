/**
 * publish:approved (GH-088 / BR-081 / BR-105): the guarded publish step.
 *
 * Publishing is an explicit maintainer decision:
 * 1. Refuses to publish unless `BUNDAR_RELEASE_TOKEN` is set AND `npm whoami` succeeds.
 * 2. Accepts `--version` (default 0.1.0-alpha.2) and `--tag` (default canary / alpha).
 * 3. Builds and publishes the EXACT audited candidate `.tgz` files (never source workspaces).
 * 4. Verifies SHA-256 integrity of each tarball before running `npm publish <file.tgz>`.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  buildCandidateTarballs,
  DEFAULT_TAG,
  DEFAULT_VERSION,
  PUBLISH_ORDER,
  REPO,
} from "./pack-release";

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const VERSION = argument("--version", DEFAULT_VERSION);
const DIST_TAG = argument("--tag", DEFAULT_TAG);

const token = process.env.BUNDAR_RELEASE_TOKEN;
const hasNpmIdentity =
  spawnSync("npm", ["whoami"], { stdio: "pipe" }).status === 0;

if (token === undefined || token.length === 0 || !hasNpmIdentity) {
  console.log(
    "publish:approved: DRY-RUN (no approval token or npm identity) — nothing published.",
  );
  console.log(
    `Plan: for each of ${PUBLISH_ORDER.join(" → ")}: npm publish <tarball.tgz> --tag ${DIST_TAG} --access public (version ${VERSION}).`,
  );
  console.log(
    "Approval procedure: maintainer sets BUNDAR_RELEASE_TOKEN, authenticates npm, re-runs this command with optional --tag/--version.",
  );
  process.exit(0);
}

console.log(`publish:approved: publishing ${VERSION} @ ${DIST_TAG}`);
const artifactsDir = join(REPO, "artifacts", "packages");
const candidates = buildCandidateTarballs({
  version: VERSION,
  outputDir: artifactsDir,
});

for (const pkg of PUBLISH_ORDER) {
  const candidate = candidates.get(pkg)!;
  console.log(`\n[publish] ${pkg} (${candidate.tarballFile})`);

  // Verify checksum before upload
  const currentSha = createHash("sha256")
    .update(readFileSync(candidate.tarballPath))
    .digest("hex");
  if (currentSha !== candidate.sha256) {
    console.error(`publish:approved: integrity mismatch for ${pkg}`);
    process.exit(1);
  }

  const result = spawnSync(
    "npm",
    ["publish", candidate.tarballPath, "--tag", DIST_TAG, "--access", "public"],
    {
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
  `publish:approved: ${PUBLISH_ORDER.length} packages published @ ${DIST_TAG}`,
);
