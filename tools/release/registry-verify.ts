/**
 * registry:verify (GH-088 / BR-081 / BR-111): verify published package
 * metadata on the npm registry against the persisted candidate manifest.
 *
 * --preflight (pre-publish): every manifest package's tarball must exist on
 * disk under artifacts/packages and its recomputed SHA-256 must equal the
 * manifest digest.
 *
 * post-publish (default): for each of the 9 release packages the registry
 * must report:
 *   1. candidate version exists (`npm view <pkg>@<version>`);
 *   2. dist-tag points at the candidate version;
 *   3. dist.integrity / dist.shasum correspond to the candidate SHA-256;
 *   4. internal @bundar/* dependencies resolve to lockstep ranges;
 *   5. package is not deprecated;
 * Optionally `--download` fetches the published tarball and compares its
 * SHA-256 byte-for-byte against the candidate manifest.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { readCandidateManifest, REPO } from "./pack-release";
import { normalizeDistTags } from "./registry-verify-utils";

const argv = process.argv.slice(2);
const isPreflight = argv.includes("--preflight");
const downloadCompare = argv.includes("--download");
const tagArgIndex = argv.indexOf("--tag");
const distTagOverride = tagArgIndex >= 0 ? argv[tagArgIndex + 1] : undefined;

const manifest = readCandidateManifest();
if (!manifest) {
  console.error(
    "registry:verify: artifacts/release/candidate-manifest.json missing — run `bun run publish:dry-run` first",
  );
  process.exit(1);
}
const distTag = distTagOverride ?? manifest.distTag;

console.log(
  `registry:verify: ${isPreflight ? "preflight" : "post-publish"} verification of ${manifest.packages.length} packages (version ${manifest.version}, tag ${distTag})`,
);

const failures: string[] = [];
const check = (name: string, ok: boolean, detail: string): void => {
  console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
  if (!ok) failures.push(`${name}: ${detail}`);
};

function npmView(args: readonly string[]): unknown | null {
  const result = spawnSync("npm", ["view", ...args, "--json"], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    cwd: REPO,
  });
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

for (const pkg of manifest.packages) {
  if (isPreflight) {
    // Verify the tarball ACTUALLY exists and hash matches — length checks alone are not evidence.
    const full = join(REPO, pkg.tarballPath);
    if (!existsSync(full)) {
      check(
        `preflight ${pkg.name}`,
        false,
        `${pkg.tarballPath} missing on disk`,
      );
      continue;
    }
    const actualSha = createHash("sha256")
      .update(readFileSync(full))
      .digest("hex");
    check(
      `preflight ${pkg.name}`,
      actualSha === pkg.sha256,
      actualSha === pkg.sha256
        ? `${pkg.tarballFile} on-disk SHA-256 matches manifest`
        : `manifest=${pkg.sha256.slice(0, 16)}… disk=${actualSha.slice(0, 16)}…`,
    );
    continue;
  }

  // Post-publish: does this exact version exist?
  const versionInfo = npmView([`${pkg.name}@${pkg.version}`]) as {
    version?: string;
    license?: string;
    deprecated?: string | false;
    dist?: { integrity?: string; shasum?: string };
    dependencies?: Record<string, string>;
  } | null;
  if (versionInfo === null) {
    check(
      `published ${pkg.name}`,
      false,
      `${pkg.name}@${pkg.version} not found on registry`,
    );
    continue;
  }
  const info = Array.isArray(versionInfo) ? versionInfo[0] : versionInfo;
  if (info === undefined || info === null) {
    check(`published ${pkg.name}`, false, `no metadata returned`);
    continue;
  }

  check(
    `version ${pkg.name}`,
    info.version === pkg.version,
    `registry reports ${info.version}`,
  );

  check(
    `license ${pkg.name}`,
    info.license === "MIT",
    `license is ${String(info.license)}`,
  );

  // Integrity: dist.shasum is the base64-encoded sha1; dist.integrity is SRI.
  // The strongest byte-level proof is downloading and hashing the tarball.
  let integrityOk = false;
  let integrityDetail = "not compared";
  if (downloadCompare) {
    const tmpDirResult = spawnSync("mktemp", ["-d"], { encoding: "utf8" });
    const tmpDir = tmpDirResult.stdout?.trim();
    if (tmpDir !== undefined && tmpDir.length > 0) {
      const pack = spawnSync(
        "npm",
        ["pack", `${pkg.name}@${pkg.version}`, "--pack-destination", tmpDir],
        { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      const downloadedFile = (pack.stdout ?? "").trim().split("\n").pop() ?? "";
      const downloadedPath = join(tmpDir, downloadedFile);
      if (
        pack.status === 0 &&
        downloadedFile.length > 0 &&
        existsSync(downloadedPath)
      ) {
        const downloadedSha = createHash("sha256")
          .update(readFileSync(downloadedPath))
          .digest("hex");
        integrityOk = downloadedSha === pkg.sha256;
        integrityDetail = integrityOk
          ? `downloaded tarball SHA-256 matches candidate manifest`
          : `downloaded=${downloadedSha.slice(0, 16)}… candidate=${pkg.sha256.slice(0, 16)}…`;
      } else {
        integrityDetail = "npm pack failed";
      }
    }
    // cleanup happens by OS temp policy; keep output quiet
  } else {
    // BR-112: a bare "sha512-*" algorithm match is NOT integrity evidence —
    // the digest bytes were never compared to the candidate. Post-publish
    // verification REQUIRES --download for byte-level proof.
    integrityOk = false;
    integrityDetail =
      "no --download: SRI algorithm presence is not byte-level proof — rerun with --download";
  }
  check(`integrity ${pkg.name}`, integrityOk, integrityDetail);

  // Dist-tag points at the candidate version
  const tagView = npmView([pkg.name, "dist-tags"]);
  const tags = normalizeDistTags(tagView);
  if (tags && typeof tags === "object") {
    check(
      `dist-tag ${pkg.name}`,
      tags[distTag] === pkg.version,
      `dist-tags.${distTag} = ${tags[distTag]}`,
    );
  } else {
    check(`dist-tag ${pkg.name}`, false, "dist-tags not returned by npm view");
  }

  // Internal deps in lockstep: every @bundar dependency resolves to ^candidateVersion
  const deps = info.dependencies ?? {};
  const internalDeps = Object.entries(deps).filter(([depName]) =>
    depName.startsWith("@bundar/"),
  );
  const lockstepBad = internalDeps.filter(
    ([, spec]) => spec !== `^${pkg.version}` && spec !== pkg.version,
  );
  check(
    `lockstep-deps ${pkg.name}`,
    lockstepBad.length === 0,
    lockstepBad.length === 0
      ? internalDeps.length === 0
        ? "no internal dependencies"
        : `${internalDeps.length}/${internalDeps.length} internal deps at ^${pkg.version}`
      : `stale: ${lockstepBad.map(([d, v]) => `${d}@${v}`).join(", ")}`,
  );

  // Not deprecated
  check(
    `deprecation ${pkg.name}`,
    info.deprecated === undefined || info.deprecated === false,
    info.deprecated === undefined || info.deprecated === false
      ? "not deprecated"
      : String(info.deprecated).slice(0, 120),
  );
}

if (failures.length > 0) {
  console.error(`\nregistry:verify FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `\nregistry:verify: all checks passed for ${manifest.packages.length} packages (${manifest.version})`,
);
