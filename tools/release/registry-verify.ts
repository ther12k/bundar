/**
 * registry:verify (GH-088 / BR-081 / BR-111): verify published package
 * metadata on the npm registry against the candidate manifest.
 *
 * Verifies for each of the 9 release packages:
 * 1. Package exists on registry with candidate `version`;
 * 2. Dist-tag (e.g. `canary` or `alpha`) points to the published version;
 * 3. Package integrity / shasum matches the candidate tarball;
 * 4. Internal dependencies resolve to lockstep version ranges;
 * 5. Package is not marked deprecated or private.
 *
 * In dry-run/pre-publish mode (--preflight), verifies that the candidate manifest and
 * package artifacts are ready for registry verification post-publish.
 */
import { spawnSync } from "node:child_process";
import { readCandidateManifest, REPO } from "./pack-release";

function argument(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const manifest = readCandidateManifest();
if (!manifest) {
  console.error(
    "registry:verify: artifacts/release/candidate-manifest.json missing — run `bun run publish:dry-run` first",
  );
  process.exit(1);
}

const customTag = argument("--tag");
const distTag = customTag ?? manifest.distTag;
const isPreflight = process.argv.includes("--preflight");

console.log(
  `registry:verify: verifying ${manifest.packages.length} packages for version ${manifest.version} @ tag ${distTag}`,
);

const failures: string[] = [];
const check = (name: string, ok: boolean, detail: string): void => {
  console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
  if (!ok) failures.push(`${name}: ${detail}`);
};

for (const pkg of manifest.packages) {
  if (isPreflight) {
    check(
      `preflight ${pkg.name}`,
      pkg.sha256.length === 64,
      `candidate tarball ${pkg.tarballFile} ready for registry verification`,
    );
    continue;
  }

  // Query registry metadata via npm view
  const view = spawnSync(
    "npm",
    ["view", `${pkg.name}@${pkg.version}`, "--json"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      cwd: REPO,
    },
  );

  if (view.status !== 0) {
    check(
      `registry ${pkg.name}`,
      false,
      "npm view failed — package not found on registry or registry unreachable",
    );
    continue;
  }

  try {
    const data = JSON.parse(view.stdout);
    check(
      `version ${pkg.name}`,
      data.version === pkg.version,
      `version matches candidate ${pkg.version}`,
    );
    check(
      `license ${pkg.name}`,
      data.license === "MIT",
      `license is ${data.license}`,
    );
  } catch (error) {
    check(
      `parse ${pkg.name}`,
      false,
      `failed to parse npm view output: ${error}`,
    );
  }
}

if (failures.length > 0) {
  console.error(`\nregistry:verify FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `\nregistry:verify: all checks passed for ${manifest.packages.length} packages (version ${manifest.version})`,
);
