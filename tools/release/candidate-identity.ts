/**
 * release:candidate-identity (BR-112 audit wave 8, Model B).
 *
 * Records the SINGLE authoritative candidate identity of the release
 * battery run into artifacts/release/candidate-identity.json:
 *
 *   workflowRunSha         — the exact commit the battery ran on
 *   candidateSourceSha     — the manifest's bound source SHA
 *   version / distTag      — publication coordinates
 *   candidateManifestSha256 — byte digest of candidate-manifest.json
 *   packages[]             — name + tarballFile + sha256 per package
 *   artifactName           — the uploaded bundle's immutable artifact name
 *
 * The public Candidate Release Battery uploads this file inside the same
 * bundle, so the human-gated publish job can download exactly this bundle
 * and re-verify every digest before publishing those exact bytes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { REPO } from "./pack-release";
import { loadAndVerifyCandidateManifest } from "./candidate-manifest-loader";

const manifestPath = join(
  REPO,
  "artifacts",
  "release",
  "candidate-manifest.json",
);

const loaded = loadAndVerifyCandidateManifest({ manifestPath });
if (!loaded.ok || loaded.manifest === undefined) {
  console.error("release:candidate-identity: candidate manifest rejected:");
  for (const error of loaded.errors) {
    console.error(`  [${error.stage}] ${error.detail}`);
  }
  process.exit(1);
}

const manifest = loaded.manifest;
const manifestBytes = readFileSync(manifestPath);
const candidateManifestSha256 = createHash("sha256")
  .update(manifestBytes)
  .digest("hex");
const workflowRunSha = process.env.GITHUB_SHA ?? manifest.sourceSha;

const identity = {
  generatedAt: new Date().toISOString(),
  artifactName: `release-candidate-artifacts-${workflowRunSha}`,
  workflowRunSha,
  candidateSourceSha: manifest.sourceSha,
  version: manifest.version,
  distTag: manifest.distTag,
  candidateManifestSha256,
  packages: loaded.entries.map((entry) => ({
    name: entry.name,
    tarballFile: entry.tarballFile,
    sha256: entry.sha256,
  })),
};

const outDir = join(REPO, "artifacts", "release");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "candidate-identity.json"),
  JSON.stringify(identity, null, 2) + "\n",
);

console.log("release:candidate-identity: single-authority candidate recorded");
console.log(`  bundle artifact : ${identity.artifactName}`);
console.log(`  workflow SHA    : ${identity.workflowRunSha}`);
console.log(`  source SHA      : ${identity.candidateSourceSha}`);
console.log(`  manifest sha256 : ${candidateManifestSha256}`);
console.log(`  version @ tag   : ${identity.version} @ ${identity.distTag}`);
for (const pkg of identity.packages) {
  console.log(`  ${pkg.name} ${pkg.tarballFile} (${pkg.sha256.slice(0, 16)}…)`);
}
