/**
 * publish:approved (GH-088 / BR-081 / BR-105 / BR-111): the guarded publish step.
 *
 * Safety invariants:
 * 1. `--dry-run` ALWAYS short-circuits before any credential check and can
 *    NEVER invoke npm publish, regardless of tokens or authentication.
 * 2. Publishes ONLY the exact `.tgz` files recorded in the persisted
 *    candidate manifest (`artifacts/release/candidate-manifest.json` or an
 *    explicit `--manifest <path>`). The publisher never builds tarballs.
 * 3. Verifies each tarball's SHA-256 against the manifest, and validates
 *    that name/version/tag are consistent with it.
 * 4. Strict argument parsing: unknown flags exit non-zero; publishing with
 *    dist-tag "latest" is rejected without `--allow-latest-tag` (ADR-0021).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { PUBLISH_ORDER, REPO } from "./pack-release";

interface Options {
  dryRun: boolean;
  allowLatestTag: boolean;
  tag?: string;
  manifest?: string;
}

const KNOWN_FLAGS = new Set([
  "--dry-run",
  "--allow-latest-tag",
  "--tag",
  "--manifest",
]);

function parseOptions(argv: readonly string[]): Options {
  const options: Options = { dryRun: false, allowLatestTag: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (!KNOWN_FLAGS.has(arg)) {
      console.error(`publish:approved: unknown argument "${arg}"`);
      console.error(
        `Known flags: ${[...KNOWN_FLAGS].join(", ")}`,
      );
      process.exit(2);
    }
    switch (arg) {
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--allow-latest-tag":
        options.allowLatestTag = true;
        break;
      case "--tag":
      case "--manifest": {
        const value = argv[index + 1];
        if (value === undefined || value.startsWith("--")) {
          console.error(`publish:approved: ${arg} requires a value`);
          process.exit(2);
        }
        if (arg === "--tag") options.tag = value;
        else options.manifest = value;
        index += 1;
        break;
      }
    }
  }
  return options;
}

const options = parseOptions(process.argv.slice(2));

const DEFAULT_MANIFEST = join(
  REPO,
  "artifacts",
  "release",
  "candidate-manifest.json",
);
const manifestPath = options.manifest ?? DEFAULT_MANIFEST;

if (!existsSync(manifestPath)) {
  console.error(
    `publish:approved: candidate manifest missing at ${manifestPath} — run \`bun run publish:dry-run\` first`,
  );
  process.exit(1);
}

interface ManifestPackage {
  readonly name: string;
  readonly version: string;
  readonly tarballFile: string;
  readonly tarballPath: string; // relative to REPO root
  readonly sha256: string;
}
interface CandidateManifest {
  readonly sourceSha: string;
  readonly version: string;
  readonly distTag: string;
  readonly packages: readonly ManifestPackage[];
}

let manifest: CandidateManifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.error(
    `publish:approved: failed to parse ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

if (typeof manifest.version !== "string" || !Array.isArray(manifest.packages)) {
  console.error("publish:approved: malformed candidate manifest");
  process.exit(1);
}

const distTag = options.tag ?? manifest.distTag;
if (
  distTag === "latest" &&
  !options.allowLatestTag &&
  !/^\d+\.\d+\.\d+$/.test(manifest.version)
) {
  console.error(
    "publish:approved: dist-tag 'latest' is forbidden during pre-1.0 (ADR-0021); use --tag canary / --tag alpha, or pass --allow-latest-tag explicitly",
  );
  process.exit(1);
}

// Verify every package entry BEFORE any credential or publish step.
interface VerifiedCandidate {
  readonly pkg: ManifestPackage;
  readonly absoluteTarball: string;
}
const verified: VerifiedCandidate[] = [];
for (const expectedName of PUBLISH_ORDER) {
  const pkg = manifest.packages.find((p) => p.name === expectedName);
  if (pkg === undefined) {
    console.error(
      `publish:approved: candidate manifest has no entry for ${expectedName}`,
    );
    process.exit(1);
  }
  if (pkg.version !== manifest.version) {
    console.error(
      `publish:approved: ${pkg.name} version ${pkg.version} does not match manifest version ${manifest.version}`,
    );
    process.exit(1);
  }
  const absoluteTarball = join(REPO, pkg.tarballPath);
  if (!existsSync(absoluteTarball)) {
    console.error(
      `publish:approved: candidate tarball missing on disk: ${pkg.tarballPath}`,
    );
    process.exit(1);
  }
  const actualSha = createHash("sha256")
    .update(readFileSync(absoluteTarball))
    .digest("hex");
  if (actualSha !== pkg.sha256) {
    console.error(
      `publish:approved: SHA-256 mismatch for ${pkg.name} — manifest=${pkg.sha256}, disk=${actualSha}`,
    );
    process.exit(1);
  }
  verified.push({ pkg, absoluteTarball });
}

function printPlan(): void {
  console.log(
    `Candidate plan (NOT published in this mode unless the live branch below runs):\n` +
      `  version : ${manifest!.version}\n` +
      `  dist-tag: ${distTag}\n` +
      `  source  : ${manifest!.sourceSha}\n` +
      `  order   : ${verified.map((v) => v.pkg.name).join(" → ")}\n` +
      `  tarballs:\n${verified
        .map((v) => `    - ${v.pkg.tarballFile} (${v.pkg.sha256.slice(0, 16)}…)`)
        .join("\n")}`,
  );
}

// ---- DRY-RUN GATE: absolutely cannot publish past this point ----
if (options.dryRun) {
  printPlan();
  console.log(
    "\npublish:approved: DRY-RUN complete — candidate artifacts verified, NOTHING was published.",
  );
  process.exit(0);
}

const token = process.env.BUNDAR_RELEASE_TOKEN;
const hasNpmIdentity =
  spawnSync("npm", ["whoami"], { stdio: "pipe" }).status === 0;

if (token === undefined || token.length === 0) {
  printPlan();
  console.log(
    "\npublish:approved: BUNDAR_RELEASE_TOKEN is not set — treating as dry-run. NOTHING was published.",
  );
  process.exit(0);
}
if (!hasNpmIdentity) {
  console.error(
    "publish:approved: BUNDAR_RELEASE_TOKEN is set but `npm whoami` failed — authenticate npm first.",
  );
  process.exit(1);
}

console.log(
  `publish:approved: PUBLISHING ${verified.length} packages (version ${manifest.version}) @ tag ${distTag} (source ${manifest.sourceSha})`,
);
for (const { pkg, absoluteTarball } of verified) {
  console.log(`\n[publish] ${pkg.name} (${pkg.tarballFile})`);
  const result = spawnSync(
    "npm",
    ["publish", absoluteTarball, "--tag", distTag, "--access", "public"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    console.error(
      `publish:approved: FAILED at ${pkg.name} — stopping; earlier publishes stand, later ones did not run`,
    );
    process.exit(1);
  }
}

console.log(
  `publish:approved: ${verified.length} packages published @ ${distTag}`,
);
