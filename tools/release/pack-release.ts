/**
 * Candidate packaging pipeline (ADR-0021 / BR-080 / BR-105).
 *
 * Packs the 9 workspace packages into publication-form tarballs:
 * - Sets the publication `version` (e.g. `0.1.0-alpha.2`);
 * - Removes `"private": true` on the packed tarball manifest only (source manifests stay untouched 0.0.0 private);
 * - Rewrites internal `workspace:*` dependencies to caret ranges (`^${version}`);
 * - Produces exact `.tgz` files with deterministic SHA-256 checksums.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const REPO = join(import.meta.dir, "..", "..");
export const DEFAULT_VERSION = "0.1.0-alpha.2";
export const DEFAULT_TAG = "canary";

export const PUBLISH_ORDER = [
  "@bundar/core",
  "@bundar/jsx",
  "@bundar/schema",
  "@bundar/forms",
  "@bundar/security",
  "@bundar/htmx",
  "@bundar/testing",
  "@bundar/cli",
  "create-bundar",
] as const;

export interface PackedCandidate {
  readonly name: string;
  readonly version: string;
  readonly tarballFile: string;
  /** Repo-root-relative path recorded in candidate-manifest.json. */
  readonly tarballPath: string;
  /** Absolute path on this machine for in-process I/O (never serialized). */
  readonly absolutePath: string;
  readonly sha256: string;
}

export interface CandidateManifest {
  readonly sourceSha: string;
  readonly version: string;
  readonly distTag: string;
  readonly createdAt: string;
  readonly packages: readonly PackedCandidate[];
}

export function buildCandidateTarballs(options: {
  version: string;
  outputDir: string;
}): Map<string, PackedCandidate> {
  const { version, outputDir } = options;
  mkdirSync(outputDir, { recursive: true });
  const result = new Map<string, PackedCandidate>();

  for (const pkg of PUBLISH_ORDER) {
    const dir =
      pkg === "create-bundar"
        ? join(REPO, "create-bundar")
        : join(REPO, "packages", pkg.replace("@bundar/", ""));
    const manifest = JSON.parse(
      readFileSync(join(dir, "package.json"), "utf8"),
    );
    const spawned = spawnSync("bun", ["pm", "pack"], {
      cwd: dir,
      stdio: "pipe",
    });
    if (spawned.status !== 0) {
      throw new Error(`bun pm pack failed for ${pkg}`);
    }
    const originalTarball = join(
      dir,
      `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`,
    );

    // Extract, rewrite version/private/workspace deps, repack to target
    const extractDir = mkdtempSync(join(tmpdir(), "bundar-candidate-pack-"));
    spawnSync("tar", ["-xzf", originalTarball, "-C", extractDir], {
      stdio: "ignore",
    });
    rmSync(originalTarball, { force: true });

    const pkgJsonPath = join(extractDir, "package", "package.json");
    const packedPkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    packedPkg.version = version;
    delete packedPkg.private; // Packed publication tarballs MUST NOT be private

    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
    ]) {
      const deps = packedPkg[field] as Record<string, string> | undefined;
      if (deps === undefined) continue;
      for (const [name, spec] of Object.entries(deps)) {
        if (
          name.startsWith("@bundar/") &&
          (spec === manifest.version || spec.startsWith("workspace:"))
        ) {
          deps[name] = `^${version}`; // Synchronized lockstep version (ADR-0021)
        }
      }
    }
    writeFileSync(pkgJsonPath, JSON.stringify(packedPkg, null, 2) + "\n");

    const tarballFile = `${manifest.name.replace("@", "").replace("/", "-")}-${version}.tgz`;
    const targetTarballPath = join(outputDir, tarballFile);
    spawnSync("tar", ["-czf", targetTarballPath, "-C", extractDir, "package"], {
      stdio: "ignore",
    });
    rmSync(extractDir, { recursive: true, force: true });

    const sha256 = createHash("sha256")
      .update(readFileSync(targetTarballPath))
      .digest("hex");

    result.set(pkg, {
      name: pkg,
      version,
      tarballFile,
      // BR-111: manifest paths are repo-root RELATIVE so the manifest is
      // portable across machines and runtimes.
      tarballPath: join("artifacts/packages", tarballFile),
      absolutePath: targetTarballPath,
      sha256,
    });
  }

  return result;
}

export function writeCandidateManifest(options: {
  version: string;
  distTag: string;
  candidates: Map<string, PackedCandidate>;
}): CandidateManifest {
  const sourceSha =
    spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO,
      encoding: "utf8",
    }).stdout?.trim() ?? "unknown";

  // BR-111: SOURCE files must be clean and bound to an exact commit.
  // Self-generated artifacts/ churn is expected mid-pipeline and excluded —
  // the manifest records whatever the artifacts contain, and release:verify
  // re-hashes them independently.
  const dirty = spawnSync(
    "git",
    ["status", "--porcelain", "--", ".", ":!artifacts", ":!output"],
    { cwd: REPO, encoding: "utf8" },
  ).stdout?.trim();
  if (sourceSha === undefined || dirty !== "") {
    throw new Error(
      "candidate manifest generation requires a clean SOURCE tree bound to an exact commit (BR-111):\n" +
        String(dirty ?? ""),
    );
  }
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) {
    throw new Error(`candidate manifest source SHA malformed: ${sourceSha}`);
  }

  const manifest: CandidateManifest = {
    sourceSha,
    version: options.version,
    distTag: options.distTag,
    createdAt: new Date().toISOString(),
    packages: [...options.candidates.values()],
  };

  const dir = join(REPO, "artifacts", "release");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "candidate-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return manifest;
}

export function readCandidateManifest(): CandidateManifest | null {
  const path = join(REPO, "artifacts", "release", "candidate-manifest.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CandidateManifest;
  } catch {
    return null;
  }
}
