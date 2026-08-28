/**
 * Shared strict candidate-manifest loader (BR-112 audit wave 8).
 *
 * One authoritative loader for release:verify, publish:approved, and
 * registry:verify. Beyond SHA-256 re-hashing it enforces:
 * - exact portable package schema (validateCandidateManifestPackage);
 * - per-entry version agreement with the manifest;
 * - no duplicate, missing, or extra entries (exact release-set equality
 *   against PUBLISH_ORDER);
 * - repo/root-relative path containment (`..`, absolute paths, and any
 *   escape outside rootDir are rejected) with basename/tarballFile match;
 * - packed tarball identity: the tarball's own package/package.json must
 *   carry the exact name/version, must not be private, and every internal
 *   @bundar/* / create-bundar dependency range must be lockstep.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, isAbsolute, resolve, sep } from "node:path";
import {
  PUBLISH_ORDER,
  REPO,
  validateCandidateManifestPackage,
} from "./pack-release";

export type LoaderStage =
  "parse" | "shape" | "set" | "containment" | "disk" | "packed";

export interface CandidateManifestIssue {
  readonly stage: LoaderStage;
  readonly detail: string;
}

export interface LoadedCandidateEntry {
  readonly name: string;
  readonly version: string;
  readonly tarballFile: string;
  readonly tarballPath: string;
  readonly sha256: string;
  /** Absolute path after containment resolution (present when contained). */
  readonly absoluteTarball?: string;
  /** Recomputed SHA-256 of the on-disk file (present when hashed). */
  readonly actualSha256?: string;
}

export interface LoadedCandidateManifest {
  readonly sourceSha: string;
  readonly version: string;
  readonly distTag: string;
}

export interface LoadAndVerifyOptions {
  readonly manifestPath: string;
  /** Base directory for resolving relative tarballPath values (default REPO). */
  readonly rootDir?: string;
  /** Reject duplicate/missing/extra entries vs PUBLISH_ORDER (default true). */
  readonly requireExactPackageSet?: boolean;
  /** Resolve+contain every tarballPath under rootDir and hash it (default true). */
  readonly requireContainedPaths?: boolean;
  /** Open each tarball and verify its packed package identity (default true). */
  readonly inspectTarballMetadata?: boolean;
}

export interface LoadResult {
  readonly ok: boolean;
  readonly errors: readonly CandidateManifestIssue[];
  readonly manifest?: LoadedCandidateManifest;
  /** Schema-valid entries (containment/hash/packed results are in errors). */
  readonly entries: readonly LoadedCandidateEntry[];
}

const INTERNAL_DEP_PREFIX = "@bundar/";
const INTERNAL_EXACT_DEPS = new Set(["create-bundar"]);

interface PackedManifestRead {
  readonly ok: boolean;
  readonly stdout?: string;
  readonly detail: string;
}

/**
 * Reads package/package.json from a candidate tarball. A spawn-level
 * failure (status null, e.g. EAGAIN fork pressure while the full test
 * battery and browser lanes share the machine) is transient and retried;
 * a real archive error (tar exits non-zero with a diagnostic) is rejected
 * immediately.
 */
function readPackedManifest(absoluteTarball: string): PackedManifestRead {
  let lastDetail = "unknown tar failure";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const tar = spawnSync(
      "tar",
      ["-xOf", absoluteTarball, "package/package.json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (tar.status === 0 && tar.stdout) {
      return { ok: true, stdout: tar.stdout, detail: "read" };
    }
    if (tar.error !== undefined || tar.status === null) {
      lastDetail = `tar spawn failed (attempt ${attempt}/3): ${tar.error?.message ?? "null exit status"}`;
      spawnSync("sleep", ["0.4"]);
      continue;
    }
    const stderr = (tar.stderr ?? "").trim();
    return {
      ok: false,
      detail:
        stderr.length > 0 ? stderr.slice(0, 200) : `tar exited ${tar.status}`,
    };
  }
  return { ok: false, detail: lastDetail };
}

function inspectPackedIdentity(
  entry: LoadedCandidateEntry,
): CandidateManifestIssue[] {
  const issues: CandidateManifestIssue[] = [];
  const read = readPackedManifest(entry.absoluteTarball!);
  if (!read.ok) {
    return [
      {
        stage: "packed",
        detail: `${entry.name}: cannot read package/package.json from ${entry.tarballFile} — ${read.detail}`,
      },
    ];
  }
  let packed: Record<string, unknown>;
  try {
    packed = JSON.parse(read.stdout!);
  } catch {
    return [
      { stage: "packed", detail: `${entry.name}: packed manifest is not JSON` },
    ];
  }

  if (packed.name !== entry.name) {
    issues.push({
      stage: "packed",
      detail: `${entry.tarballFile}: packed name "${String(packed.name)}" does not match manifest entry "${entry.name}"`,
    });
  }
  if (packed.version !== entry.version) {
    issues.push({
      stage: "packed",
      detail: `${entry.name}: packed version "${String(packed.version)}" does not match "${entry.version}"`,
    });
  }
  if (packed.private === true) {
    issues.push({
      stage: "packed",
      detail: `${entry.name}: packed manifest is private:true — publication tarballs must not be private`,
    });
  }
  const staleRanges: string[] = [];
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = packed[field] as Record<string, string> | undefined;
    if (deps === undefined || typeof deps !== "object") continue;
    for (const [depName, spec] of Object.entries(deps)) {
      const internal =
        depName.startsWith(INTERNAL_DEP_PREFIX) ||
        INTERNAL_EXACT_DEPS.has(depName);
      if (!internal) continue;
      if (spec !== `^${entry.version}` && spec !== entry.version) {
        staleRanges.push(`${depName}@${spec}`);
      }
    }
  }
  if (staleRanges.length > 0) {
    issues.push({
      stage: "packed",
      detail: `${entry.name}: internal dependency ranges are not lockstep ^${entry.version}: ${staleRanges.join(", ")}`,
    });
  }
  return issues;
}

export function loadAndVerifyCandidateManifest(
  options: LoadAndVerifyOptions,
): LoadResult {
  const errors: CandidateManifestIssue[] = [];
  const requireExactSet = options.requireExactPackageSet ?? true;
  const containPaths = options.requireContainedPaths ?? true;
  const inspectPacked = options.inspectTarballMetadata ?? true;
  const rootDir = resolve(options.rootDir ?? REPO);

  // ---- parse + top-level shape ----
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(options.manifestPath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          stage: "parse",
          detail: `cannot parse ${options.manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      entries: [],
    };
  }
  for (const field of ["sourceSha", "version", "distTag"]) {
    if (typeof raw[field] !== "string" || (raw[field] as string).length === 0) {
      errors.push({
        stage: "shape",
        detail: `manifest.${field} must be a non-empty string`,
      });
    }
  }
  if (!Array.isArray(raw.packages)) {
    errors.push({
      stage: "shape",
      detail: "manifest.packages must be an array",
    });
    return { ok: false, errors, entries: [] };
  }
  if (errors.length > 0) return { ok: false, errors, entries: [] };
  const manifest: LoadedCandidateManifest = {
    sourceSha: raw.sourceSha as string,
    version: raw.version as string,
    distTag: raw.distTag as string,
  };

  // ---- per-entry shape + version agreement ----
  const parsed: LoadedCandidateEntry[] = [];
  for (const [index, pkg] of (raw.packages as unknown[]).entries()) {
    const shapeResult = validateCandidateManifestPackage(pkg);
    if (!shapeResult.ok) {
      errors.push({
        stage: "shape",
        detail: `packages[${index}] (${String((pkg as Record<string, unknown>)?.name ?? "?")}): ${shapeResult.detail}`,
      });
      continue;
    }
    const entry = pkg as LoadedCandidateEntry;
    if (entry.version !== manifest.version) {
      errors.push({
        stage: "shape",
        detail: `packages[${index}] (${entry.name}) version ${entry.version} does not agree with manifest version ${manifest.version}`,
      });
    }
    parsed.push(entry);
  }

  // ---- set equality / uniqueness ----
  const counts = new Map<string, number>();
  for (const entry of parsed) {
    counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count > 1) {
      errors.push({
        stage: "set",
        detail: `duplicate package entry: ${name} appears ${count} times`,
      });
    }
  }
  if (requireExactSet) {
    const present = new Set(counts.keys());
    const expectedNames = new Set<string>(PUBLISH_ORDER);
    for (const name of PUBLISH_ORDER) {
      if (!present.has(name)) {
        errors.push({ stage: "set", detail: `missing package entry: ${name}` });
      }
    }
    for (const name of present) {
      if (!expectedNames.has(name)) {
        errors.push({ stage: "set", detail: `unknown package entry: ${name}` });
      }
    }
  }

  // ---- path containment + on-disk hash + packed identity ----
  const verified: LoadedCandidateEntry[] = [];
  if (containPaths) {
    for (const entry of parsed) {
      const rel = entry.tarballPath;
      if (rel.length === 0 || isAbsolute(rel) || rel.includes("..")) {
        errors.push({
          stage: "containment",
          detail: `${entry.name}: tarballPath "${rel}" must be a repo-root-relative contained path`,
        });
        continue;
      }
      const absolute = resolve(rootDir, rel);
      if (!(absolute + "").startsWith(rootDir + sep)) {
        errors.push({
          stage: "containment",
          detail: `${entry.name}: resolved tarball path escapes rootDir (${rootDir})`,
        });
        continue;
      }
      if (basename(absolute) !== entry.tarballFile) {
        errors.push({
          stage: "containment",
          detail: `${entry.name}: tarballFile "${entry.tarballFile}" does not match resolved basename "${basename(absolute)}"`,
        });
        continue;
      }
      if (!existsSync(absolute)) {
        errors.push({
          stage: "disk",
          detail: `${entry.name}: candidate tarball missing on disk: ${rel}`,
        });
        continue;
      }
      const actualSha256 = createHash("sha256")
        .update(readFileSync(absolute))
        .digest("hex");
      const resolved: LoadedCandidateEntry = {
        ...entry,
        absoluteTarball: absolute,
        actualSha256,
      };
      verified.push(resolved);
      if (actualSha256 !== entry.sha256) {
        errors.push({
          stage: "disk",
          detail: `${entry.name}: SHA-256 mismatch — manifest=${entry.sha256.slice(0, 16)}… disk=${actualSha256.slice(0, 16)}…`,
        });
        continue;
      }
      if (inspectPacked) {
        errors.push(...inspectPackedIdentity(resolved));
      }
    }
  } else {
    verified.push(...parsed);
  }

  return { ok: errors.length === 0, errors, manifest, entries: verified };
}
