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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { REPO } from "./pack-release";
import { loadAndVerifyCandidateManifest } from "./candidate-manifest-loader";
import { normalizeDistTags } from "./registry-verify-utils";

export interface RegistryPackageReport {
  readonly name: string;
  readonly candidateVersion: string;
  readonly candidateSha256: string;
  readonly onDiskSha256?: string;
  readonly onDiskMatches?: boolean;
  readonly registryVersion?: string;
  readonly versionMatches?: boolean;
  readonly license?: string;
  readonly licenseMatches?: boolean;
  readonly downloadedSha256?: string;
  readonly downloadedMatches?: boolean;
  readonly distTag?: string;
  readonly tagMatches?: boolean;
  readonly lockstepDependencies?: boolean;
  readonly deprecated?: string | boolean;
  readonly status: "pass" | "fail";
}

export interface RegistryVerifyReport {
  readonly mode: "preflight" | "post-publish";
  readonly version: string;
  readonly distTag: string;
  readonly success: boolean;
  readonly packages: readonly RegistryPackageReport[];
}

const argv = process.argv.slice(2);
const isPreflight = argv.includes("--preflight");
const downloadCompare = argv.includes("--download");
const tagArgIndex = argv.indexOf("--tag");
const distTagOverride = tagArgIndex >= 0 ? argv[tagArgIndex + 1] : undefined;
const manifestArgIndex = argv.indexOf("--manifest");
const manifestOverride =
  manifestArgIndex >= 0 ? argv[manifestArgIndex + 1] : undefined;
const rootDirArgIndex = argv.indexOf("--root-dir");
const rootDirOverride =
  rootDirArgIndex >= 0 ? argv[rootDirArgIndex + 1] : undefined;

// Wave 8: registry verification consumes the SAME shared strict loader as
// the publisher and release:verify — so --manifest/--root-dir can point at
// the authoritative candidate bundle and still get schema, exact-set,
// containment, byte-hash, and packed-identity verification.
const DEFAULT_MANIFEST = join(
  REPO,
  "artifacts",
  "release",
  "candidate-manifest.json",
);
const loaded = loadAndVerifyCandidateManifest({
  manifestPath: manifestOverride ?? DEFAULT_MANIFEST,
  rootDir: rootDirOverride ?? REPO,
});
if (!loaded.ok || loaded.manifest === undefined) {
  console.error(
    `registry:verify: candidate manifest rejected (${manifestOverride ?? "artifacts/release/candidate-manifest.json"}):`,
  );
  for (const error of loaded.errors.slice(0, 10)) {
    console.error(`  [${error.stage}] ${error.detail}`);
  }
  process.exit(1);
}
const manifest = loaded.manifest;
const distTag = distTagOverride ?? manifest.distTag;

console.log(
  `registry:verify: ${isPreflight ? "preflight" : "post-publish"} verification of ${loaded.entries.length} packages (version ${manifest.version}, tag ${distTag})`,
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

const packageReports: RegistryPackageReport[] = [];

for (const pkg of loaded.entries) {
  if (isPreflight) {
    // Loader already enforced containment, existence, byte-hash equality,
    // and packed identity; surface the same evidence per package.
    if (pkg.absoluteTarball === undefined || !existsSync(pkg.absoluteTarball)) {
      check(
        `preflight ${pkg.name}`,
        false,
        `${pkg.tarballPath} missing on disk`,
      );
      packageReports.push({
        name: pkg.name,
        candidateVersion: pkg.version,
        candidateSha256: pkg.sha256,
        onDiskMatches: false,
        status: "fail",
      });
      continue;
    }
    const actualSha = pkg.actualSha256!;
    const onDiskMatches = actualSha === pkg.sha256;
    check(
      `preflight ${pkg.name}`,
      onDiskMatches,
      onDiskMatches
        ? `${pkg.tarballFile} on-disk SHA-256 matches manifest`
        : `manifest=${pkg.sha256.slice(0, 16)}… disk=${actualSha.slice(0, 16)}…`,
    );
    packageReports.push({
      name: pkg.name,
      candidateVersion: pkg.version,
      candidateSha256: pkg.sha256,
      onDiskSha256: actualSha,
      onDiskMatches,
      status: onDiskMatches ? "pass" : "fail",
    });
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
    packageReports.push({
      name: pkg.name,
      candidateVersion: pkg.version,
      candidateSha256: pkg.sha256,
      versionMatches: false,
      status: "fail",
    });
    continue;
  }
  const info = Array.isArray(versionInfo) ? versionInfo[0] : versionInfo;
  if (info === undefined || info === null) {
    check(`published ${pkg.name}`, false, `no metadata returned`);
    packageReports.push({
      name: pkg.name,
      candidateVersion: pkg.version,
      candidateSha256: pkg.sha256,
      versionMatches: false,
      status: "fail",
    });
    continue;
  }

  const versionMatches = info.version === pkg.version;
  check(
    `version ${pkg.name}`,
    versionMatches,
    `registry reports ${info.version}`,
  );

  const licenseMatches = info.license === "MIT";
  check(
    `license ${pkg.name}`,
    licenseMatches,
    `license is ${String(info.license)}`,
  );

  // Integrity: dist.shasum is the base64-encoded sha1; dist.integrity is SRI.
  // The strongest byte-level proof is downloading and hashing the tarball.
  let integrityOk = false;
  let integrityDetail = "not compared";
  let downloadedSha: string | undefined;
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
        downloadedSha = createHash("sha256")
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
  let tagMatches = false;
  if (tags && typeof tags === "object") {
    tagMatches = tags[distTag] === pkg.version;
    check(
      `dist-tag ${pkg.name}`,
      tagMatches,
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
  const lockstepMatches = lockstepBad.length === 0;
  check(
    `lockstep-deps ${pkg.name}`,
    lockstepMatches,
    lockstepMatches
      ? internalDeps.length === 0
        ? "no internal dependencies"
        : `${internalDeps.length}/${internalDeps.length} internal deps at ^${pkg.version}`
      : `stale: ${lockstepBad.map(([d, v]) => `${d}@${v}`).join(", ")}`,
  );

  // Not deprecated
  const notDeprecated =
    info.deprecated === undefined || info.deprecated === false;
  check(
    `deprecation ${pkg.name}`,
    notDeprecated,
    notDeprecated ? "not deprecated" : String(info.deprecated).slice(0, 120),
  );

  const pkgPass =
    versionMatches &&
    licenseMatches &&
    integrityOk &&
    tagMatches &&
    lockstepMatches &&
    notDeprecated;

  packageReports.push({
    name: pkg.name,
    candidateVersion: pkg.version,
    candidateSha256: pkg.sha256,
    registryVersion: info.version,
    versionMatches,
    license: info.license,
    licenseMatches,
    downloadedSha256: downloadedSha,
    downloadedMatches: integrityOk,
    distTag,
    tagMatches,
    lockstepDependencies: lockstepMatches,
    deprecated: info.deprecated ?? false,
    status: pkgPass ? "pass" : "fail",
  });
}

const report: RegistryVerifyReport = {
  mode: isPreflight ? "preflight" : "post-publish",
  version: manifest.version,
  distTag,
  success: failures.length === 0,
  packages: packageReports,
};

mkdirSync(join(REPO, "artifacts"), { recursive: true });
writeFileSync(
  join(REPO, "artifacts", "registry-verify.json"),
  JSON.stringify(report, null, 2) + "\n",
);

if (failures.length > 0) {
  console.error(`\nregistry:verify FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `\nregistry:verify: all checks passed for ${loaded.entries.length} packages (${manifest.version})`,
);
