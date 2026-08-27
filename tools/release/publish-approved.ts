/**
 * publish:approved (GH-088 / BR-081 / BR-105 / BR-111 / wave 8): the
 * guarded publish step.
 *
 * Safety invariants:
 * 1. `--dry-run` ALWAYS short-circuits before any credential check and can
 *    NEVER invoke npm publish, regardless of tokens or authentication.
 * 2. Publishes ONLY the exact `.tgz` files recorded in a candidate manifest
 *    (`artifacts/release/candidate-manifest.json`, an explicit
 *    `--manifest <path>`, or an uploaded candidate bundle resolved through
 *    `--tarball-root <dir>`). The publisher never builds tarballs.
 * 3. The shared strict manifest loader (wave 8) verifies schema, exact
 *    release-set equality, path containment, SHA-256 bytes, AND packed
 *    tarball identity (name/version/non-private/lockstep ranges) before
 *    anything else runs.
 * 4. Strict argument parsing: unknown flags exit non-zero; publishing with
 *    dist-tag "latest" is rejected without `--allow-latest-tag` (ADR-0021).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { candidateSourceIdentity, PUBLISH_ORDER, REPO } from "./pack-release";
import { loadAndVerifyCandidateManifest } from "./candidate-manifest-loader";

interface Options {
  dryRun: boolean;
  allowLatestTag: boolean;
  tag?: string;
  manifest?: string;
  tarballRoot?: string;
}

const KNOWN_FLAGS = new Set([
  "--dry-run",
  "--allow-latest-tag",
  "--tag",
  "--manifest",
  "--tarball-root",
]);

function parseOptions(argv: readonly string[]): Options {
  const options: Options = { dryRun: false, allowLatestTag: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (!KNOWN_FLAGS.has(arg)) {
      console.error(`publish:approved: unknown argument "${arg}"`);
      console.error(`Known flags: ${[...KNOWN_FLAGS].join(", ")}`);
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
      case "--manifest":
      case "--tarball-root": {
        const value = argv[index + 1];
        if (value === undefined || value.startsWith("--")) {
          console.error(`publish:approved: ${arg} requires a value`);
          process.exit(2);
        }
        if (arg === "--tag") options.tag = value;
        else if (arg === "--manifest") options.manifest = value;
        else options.tarballRoot = value;
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

// Wave 8: one shared strict loader for every consumer of a candidate
// manifest — exact portable schema, exact PUBLISH_ORDER set equality,
// path containment (also under --tarball-root), SHA-256 re-hash of the
// actual bytes, and packed-tarball identity inspection.
const loaded = loadAndVerifyCandidateManifest({
  manifestPath,
  rootDir: options.tarballRoot ?? REPO,
});
if (!loaded.ok || loaded.manifest === undefined) {
  console.error(
    `publish:approved: candidate manifest rejected (${manifestPath}):`,
  );
  for (const error of loaded.errors.slice(0, 10)) {
    console.error(`  [${error.stage}] ${error.detail}`);
  }
  if (loaded.errors.length > 10) {
    console.error(`  …and ${loaded.errors.length - 10} more`);
  }
  process.exit(1);
}
const manifest = loaded.manifest;
// Publish strictly in dependency-first order regardless of manifest order.
const verified = PUBLISH_ORDER.map((name) => {
  const entry = loaded.entries.find((e) => e.name === name)!;
  return {
    pkg: entry,
    absoluteTarball: entry.absoluteTarball!,
  };
});

const sourceIdentity = candidateSourceIdentity(manifest.sourceSha);
if (!sourceIdentity.ok) {
  console.error(
    `publish:approved: candidate source identity rejected — ${sourceIdentity.detail}`,
  );
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

function printPlan(): void {
  console.log(
    `Candidate plan (NOT published in this mode unless the live branch below runs):\n` +
      `  version : ${manifest.version}\n` +
      `  dist-tag: ${distTag}\n` +
      `  source  : ${manifest.sourceSha}\n` +
      `  order   : ${verified.map((v) => v.pkg.name).join(" → ")}\n` +
      `  tarballs:\n${verified
        .map(
          (v) => `    - ${v.pkg.tarballFile} (${v.pkg.sha256.slice(0, 16)}…)`,
        )
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
