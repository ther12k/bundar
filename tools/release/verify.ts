/**
 * release:verify (GH-088 / BR-106 / BR-111 / wave 8): the go/no-go
 * preconditions from the release commit, fail-closed —
 *
 * 1. Candidate identity: the persisted candidate-manifest.json exists and
 *    passes the shared strict loader (exact portable schema, exact
 *    release-set equality, path containment, on-disk SHA-256 re-hash,
 *    packed-tarball identity), bound to a clean ancestor source SHA.
 * 2. Cross-artifact set equality: for all 9 packages, {name, version,
 *    tarballFile, sha256} records match EXACTLY across candidate manifest,
 *    checksums.txt, SBOM release components, provenance subjects, and the
 *    publish-dry-run plan (publish order as an exact array).
 * 3. Candidate consistency: manifest version/dist-tag agree with the
 *    publish-dry-run plan.
 * 4. Canonical dry-run contract: the report's own declared check count is
 *    never trusted; checks must equal the canonical ordered list with all
 *    statuses passing (wave 8).
 * 5. Stable lane + no-JS matrix green; htmx 4 stays experimental AND
 *    non-default in shipped templates/notes.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { candidateSourceIdentity, PUBLISH_ORDER } from "./pack-release";
import { loadAndVerifyCandidateManifest } from "./candidate-manifest-loader";
import {
  EXPECTED_DRY_RUN_CHECK_COUNT,
  validateDryRunChecks,
  validateExactPublishOrder,
} from "./dry-run-contract";
import { purl } from "./sbom-utils";

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

// ---- load candidate manifest through the shared strict loader ----
const manifestPath = join(
  REPO,
  "artifacts",
  "release",
  "candidate-manifest.json",
);
interface DryRunReport {
  plan: {
    simulatedVersion?: string;
    distTag?: string;
    publishOrder?: unknown;
  };
}

if (!existsSync(manifestPath)) {
  check(
    "candidate-manifest",
    false,
    "artifacts/release/candidate-manifest.json missing — run `bun run publish:dry-run` first",
  );
} else {
  const loaded = loadAndVerifyCandidateManifest({ manifestPath });
  const manifest = loaded.manifest;
  const stageErrors = (stages: readonly string[]): string[] =>
    loaded.errors
      .filter((error) => stages.includes(error.stage))
      .map((error) => error.detail);

  const shapeErrors = stageErrors(["parse", "shape", "set", "containment"]);
  const hexOk =
    manifest !== undefined && /^[0-9a-f]{40}$/.test(manifest.sourceSha);
  const identity =
    manifest === undefined || !hexOk
      ? { ok: false, detail: `sourceSha missing or malformed` }
      : candidateSourceIdentity(manifest.sourceSha);
  check(
    "candidate-shape",
    shapeErrors.length === 0 && identity.ok,
    `${identity.detail}; ${shapeErrors.length === 0 ? "exact portable fields, exact release set, contained repo-relative paths" : shapeErrors.slice(0, 3).join(" | ")}`,
  );

  const diskErrors = stageErrors(["disk"]);
  check(
    "artifact-hashes",
    diskErrors.length === 0 && loaded.entries.length === PUBLISH_ORDER.length,
    diskErrors.length === 0
      ? `${loaded.entries.length}/${PUBLISH_ORDER.length} candidate tarballs exist with recomputed SHA-256 matching the manifest`
      : diskErrors.slice(0, 3).join(" | "),
  );

  const packedErrors = stageErrors(["packed"]);
  check(
    "candidate-packed-identity",
    packedErrors.length === 0,
    packedErrors.length === 0
      ? `all ${loaded.entries.length} packed manifests match name/version, are non-private, and use lockstep internal ranges`
      : packedErrors.slice(0, 3).join(" | "),
  );

  if (manifest !== undefined) {
    // ---- collect the five artifact sets as comparable records ----
    const sets: Record<string, Map<string, ArtifactRecord>> = {};

    sets["candidate-manifest"] = new Map(
      loaded.entries.map((p) => [
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
      loaded.entries.map((p) => [p.tarballFile, p]),
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

    const allSbomComponents = [
      ...(sbom.components ?? []),
      ...(sbom.metadata?.component ? [sbom.metadata.component] : []),
    ];
    const sbomComponentRefs = new Set<string>(
      allSbomComponents.map(
        (component: { "bom-ref"?: string; purl?: string }) =>
          component["bom-ref"] ?? component.purl ?? "",
      ),
    );
    const sbomDependencyRefs = (sbom.dependencies ?? []).flatMap(
      (dependency: { ref?: string; dependsOn?: string[] }) => [
        dependency.ref ?? "",
        ...(dependency.dependsOn ?? []),
      ],
    );
    const danglingSbomRefs = sbomDependencyRefs.filter(
      (ref: string) => !sbomComponentRefs.has(ref),
    );
    const candidateSbomRefs = loaded.entries.map((pkg) =>
      purl(pkg.name, pkg.version),
    );
    const candidateSbomRefsPresent = candidateSbomRefs.every((ref) =>
      sbomComponentRefs.has(ref),
    );
    const candidateSbomVersionsOk = loaded.entries.every((pkg) => {
      const component = (sbom.components ?? []).find(
        (candidate: { name?: string }) => candidate.name === pkg.name,
      );
      return (
        component?.version === pkg.version &&
        component?.purl === purl(pkg.name, pkg.version) &&
        component?.["bom-ref"] === purl(pkg.name, pkg.version)
      );
    });
    check(
      "sbom-dependency-integrity",
      danglingSbomRefs.length === 0 &&
        candidateSbomRefsPresent &&
        candidateSbomVersionsOk,
      danglingSbomRefs.length === 0 &&
        candidateSbomRefsPresent &&
        candidateSbomVersionsOk
        ? `${sbomComponentRefs.size} component refs resolve all dependency edges and candidate refs use publication versions`
        : `dangling refs: ${danglingSbomRefs.slice(0, 5).join(", ") || "none"}; candidate refs in components: ${candidateSbomRefsPresent}; candidate publication refs valid: ${candidateSbomVersionsOk}`,
    );

    // Provenance subjects
    const provenance = JSON.parse(
      readFileSync(
        join(REPO, "artifacts", "provenance", "provenance.json"),
        "utf8",
      ),
    );
    const provenanceSourceSha =
      provenance.predicate?.invocation?.configSource?.digest?.sha1;
    const provenanceMaterialSha =
      provenance.predicate?.materials?.[0]?.digest?.sha1;
    check(
      "provenance-source-identity",
      provenanceSourceSha === manifest.sourceSha &&
        provenanceMaterialSha === manifest.sourceSha,
      `configSource.sha1=${String(provenanceSourceSha)}; materials[0].sha1=${String(provenanceMaterialSha)}; candidate sourceSha=${manifest.sourceSha}`,
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

    // Publish dry-run plan order — exact array equality against the
    // dependency-first PUBLISH_ORDER constant (wave 8: set equality is
    // insufficient evidence of dependency-first ordering).
    const dryRun: DryRunReport = JSON.parse(
      readFileSync(join(REPO, "artifacts", "publish-dry-run.json"), "utf8"),
    );
    const orderContract = validateExactPublishOrder(dryRun.plan.publishOrder);
    check(
      "publish-order-exact",
      orderContract.ok,
      orderContract.ok
        ? `publish order matches dependency-first PUBLISH_ORDER exactly (${PUBLISH_ORDER.length} packages, @bundar namespace cleared per GH-004/GH-086)`
        : orderContract.problems.join("; "),
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

    // Canonical dry-run contract (wave 8): the declared expectedCheckCount
    // inside the JSON is never trusted — names/count/order/status must
    // satisfy the shared contract module.
    const dryRunContract = validateDryRunChecks(dryRun);
    check(
      "dry-run-checks-pass",
      dryRunContract.ok,
      dryRunContract.ok
        ? `all ${EXPECTED_DRY_RUN_CHECK_COUNT} canonical publication dry-run checks passed in contract order with success=true`
        : dryRunContract.problems.slice(0, 4).join("; "),
    );
  }
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
