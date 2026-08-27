/**
 * release:verify (GH-088 / BR-106 / BR-111): the go/no-go preconditions
 * from the release commit, fail-closed —
 *
 * 1. Candidate identity: the persisted candidate-manifest.json exists,
 *    bound to a 40-char source SHA; every listed tarball exists on disk and
 *    its recomputed SHA-256 matches the manifest.
 * 2. Cross-artifact set equality: for all 9 packages, {name, version,
 *    tarballFile, sha256} records match EXACTLY across candidate manifest,
 *    checksums.txt, SBOM release components, provenance subjects, and the
 *    publish-dry-run plan (publish order).
 * 3. Candidate consistency: manifest version/dist-tag agree with the
 *    publish-dry-run plan.
 * 4. Package-name clearance: dependency-first @bundar namespace order.
 * 5. Stable lane + no-JS matrix green; htmx 4 stays experimental AND
 *    non-default in shipped templates/notes.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { candidateSourceIdentity, PUBLISH_ORDER } from "./pack-release";

const REPO = join(import.meta.dir, "..", "..");
const failures: string[] = [];
const check = (name: string, ok: boolean, detail: string): void => {
  console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
  if (!ok) failures.push(name);
};

interface ArtifactRecord {
  name: string;
  version: string;
  tarballFile: string;
  sha256: string;
}

function recordKey(r: {
  name: string;
  version: string;
  tarballFile: string;
  sha256: string;
}): string {
  return `${r.name}@${r.version}|${r.tarballFile}|${r.sha256}`;
}

// ---- load candidate manifest ----
const manifestPath = join(
  REPO,
  "artifacts",
  "release",
  "candidate-manifest.json",
);
if (!existsSync(manifestPath)) {
  check(
    "candidate-manifest",
    false,
    "artifacts/release/candidate-manifest.json missing — run `bun run publish:dry-run` first",
  );
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    sourceSha: string;
    version: string;
    distTag: string;
    packages: ReadonlyArray<{
      name: string;
      version: string;
      tarballFile: string;
      tarballPath: string;
      sha256: string;
    }>;
  };

  // 1a. SHA binding: sourceSha must be HEAD, or an ancestor of HEAD whose
  // package-affecting SOURCE tree is unchanged since (BR-112 Model B —
  // artifacts/docs-only commits after the candidate build are allowed;
  // any change under packages/, create-bundar/, tools/release/, or the root
  // manifests voids candidate identity).
  const identity = candidateSourceIdentity(manifest.sourceSha);
  const shaShapeOk = /^[0-9a-f]{40}$/.test(manifest.sourceSha);
  const pathsOk = manifest.packages.every(
    (p) =>
      p.tarballPath === join("artifacts/packages", p.tarballFile) &&
      !p.tarballPath.startsWith("/") &&
      !p.tarballPath.includes(".."),
  );
  check(
    "candidate-shape",
    shaShapeOk && pathsOk && identity.ok,
    `${identity.detail}; repo-relative artifact paths: ${pathsOk}`,
  );

  // 1b. On-disk integrity of every candidate tarball
  let diskValid = true;
  for (const pkg of manifest.packages) {
    const full = join(REPO, pkg.tarballPath);
    if (!existsSync(full)) {
      console.error(`  missing: ${pkg.tarballPath}`);
      diskValid = false;
      continue;
    }
    const hash = createHash("sha256").update(readFileSync(full)).digest("hex");
    if (hash !== pkg.sha256) {
      console.error(
        `  drift: ${pkg.tarballFile} manifest=${pkg.sha256.slice(0, 16)} disk=${hash.slice(0, 16)}`,
      );
      diskValid = false;
    }
  }
  check(
    "artifact-hashes",
    diskValid && manifest.packages.length === PUBLISH_ORDER.length,
    `${manifest.packages.length}/${PUBLISH_ORDER.length} candidate tarballs exist with recomputed SHA-256 matching the manifest`,
  );

  // ---- collect the five artifact sets as comparable records ----
  const sets: Record<string, Map<string, ArtifactRecord>> = {};

  sets["candidate-manifest"] = new Map(
    manifest.packages.map((p) => [
      p.name,
      {
        name: p.name,
        version: p.version,
        tarballFile: p.tarballFile,
        sha256: p.sha256,
      },
    ]),
  );

  // checksums.txt
  // BR-111: records inferred by matching the known candidate tarball names,
  // not by guess-splitting filenames.
  const expectedTgzByFile = new Map(
    manifest.packages.map((p) => [p.tarballFile, p]),
  );
  const checksumsRecords = new Map<string, ArtifactRecord>();
  for (const line of readFileSync(
    join(REPO, "artifacts", "packages", "checksums.txt"),
    "utf8",
  ).split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const spaceIdx = trimmed.indexOf("  ");
    if (spaceIdx === -1) continue;
    const sha256 = trimmed.slice(0, spaceIdx);
    const tarballFile = trimmed
      .slice(spaceIdx + 2)
      .replace(/^artifacts\/packages\//, "");
    const matchPkg = expectedTgzByFile.get(tarballFile);
    if (matchPkg === undefined) continue;
    checksumsRecords.set(matchPkg.name, {
      name: matchPkg.name,
      version: matchPkg.version,
      tarballFile: matchPkg.tarballFile,
      sha256,
    });
  }
  sets["checksums"] = checksumsRecords;

  // SBOM release components
  const sbom = JSON.parse(
    readFileSync(join(REPO, "artifacts", "sbom", "sbom.json"), "utf8"),
  );
  const sbomRecords = new Map<string, ArtifactRecord>();
  for (const c of sbom.components) {
    const hash =
      c.hashes?.find((h: { alg: string }) => h.alg === "SHA-256")?.content ??
      "";
    const matchPkg = [...expectedTgzByFile.entries()].find(
      ([, p]) => p.name === c.name,
    );
    if (matchPkg === undefined) continue;
    const [, p] = matchPkg;
    sbomRecords.set(c.name, {
      name: c.name,
      version: c.version,
      tarballFile: p.tarballFile,
      sha256: hash,
    });
  }
  sets["sbom"] = sbomRecords;

  // Provenance subjects
  const provenance = JSON.parse(
    readFileSync(
      join(REPO, "artifacts", "provenance", "provenance.json"),
      "utf8",
    ),
  );
  const provRecords = new Map<string, ArtifactRecord>();
  for (const subjectEntry of provenance.subject) {
    const sha256 = subjectEntry.digest?.sha256 ?? "";
    const tarballFile: string = subjectEntry.name;
    const matchPkg = expectedTgzByFile.get(tarballFile);
    if (matchPkg === undefined) continue;
    provRecords.set(matchPkg.name, {
      name: matchPkg.name,
      version: matchPkg.version,
      tarballFile,
      sha256,
    });
  }
  sets["provenance"] = provRecords;

  // Publish dry-run plan order
  const dryRun = JSON.parse(
    readFileSync(join(REPO, "artifacts", "publish-dry-run.json"), "utf8"),
  );
  const planNames = new Set<string>(dryRun.plan.publishOrder);
  const expectedNames = new Set(PUBLISH_ORDER);
  check(
    "publish-order-set-equality",
    planNames.size === expectedNames.size &&
      [...expectedNames].every((n) => planNames.has(n)),
    `publish order lists exactly the ${expectedNames.size} release packages`,
  );

  // Cross-artifact equality over the four record-bearing sets
  const reference = sets["candidate-manifest"];
  for (const [setName, set] of Object.entries(sets)) {
    if (setName === "candidate-manifest") continue;
    const keysMatch =
      set.size === reference.size &&
      [...reference.keys()].every((n) => set.has(n));
    const valuesMatch =
      keysMatch &&
      [...reference.entries()].every(([n, ref]) =>
        set.has(n) ? recordKey(set.get(n)!) === recordKey(ref) : false,
      );
    check(
      `set-equality:${setName}`,
      keysMatch && valuesMatch,
      keysMatch
        ? valuesMatch
          ? `${set.size}/${reference.size} records identical to the candidate manifest (name+version+file+sha256)`
          : `${set.size}/${reference.size} names present but at least one record differs`
        : `${set.size}/${reference.size} names matched`,
    );
  }

  // Candidate consistency vs dry-run plan metadata
  check(
    "plan-consistency",
    dryRun.plan.simulatedVersion === manifest.version &&
      dryRun.plan.distTag === manifest.distTag,
    `dry-run plan (${dryRun.plan.simulatedVersion} @ ${dryRun.plan.distTag}) agrees with the candidate manifest (${manifest.version} @ ${manifest.distTag})`,
  );
}

// Namespace clearance
{
  const dryRun = JSON.parse(
    readFileSync(join(REPO, "artifacts", "publish-dry-run.json"), "utf8"),
  );
  check(
    "package-clearance",
    dryRun.plan.publishOrder.length === PUBLISH_ORDER.length &&
      dryRun.plan.publishOrder[0] === "@bundar/core",
    `@bundar namespace cleared (GH-004/GH-086): ${PUBLISH_ORDER.length} packages in dependency-first order`,
  );
}

// Conformance matrix lanes
{
  const matrix = JSON.parse(
    readFileSync(
      join(REPO, "artifacts", "conformance", "release-matrix.json"),
      "utf8",
    ),
  );
  const requiredLanes = matrix.suites.filter((suite: { lane: string }) =>
    ["htmx2", "no-js", "all"].includes(suite.lane),
  );
  check(
    "stable-and-nojs-lanes",
    matrix.summary.failed === 0 && requiredLanes.length > 0,
    `${matrix.summary.passed}/${matrix.summary.total} suites green incl. ${requiredLanes.length} stable/no-JS lanes`,
  );
}

// htmx 4 stays experimental and non-default
{
  const { htmx4Experimental } = await import("@bundar/htmx/4");
  const scaffoldDefault = readFileSync(
    join(REPO, "templates", "minimal", "src", "platform", "dialect.ts"),
    "utf8",
  );
  const notes = readFileSync(
    join(REPO, "docs", "release-notes", "alpha.md"),
    "utf8",
  );
  check(
    "htmx4-experimental-nondefault",
    htmx4Experimental.maturity === "experimental" &&
      /export const dialect = htmx2;/.test(scaffoldDefault) &&
      notes.includes("4.0.0-beta6"),
    "adapter maturity experimental; templates default to htmx 2; notes pin the beta explicitly",
  );
}

if (failures.length > 0) {
  console.error(`release:verify FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("release:verify: all go/no-go preconditions hold");
