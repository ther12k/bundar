/**
 * BR-112 audit wave 8 regressions:
 *
 * 1. Canonical dry-run check contract — a report can never pass
 *    release:verify by declaring its own smaller/bigger/reordered check
 *    list; writer and verifier share one canonical ordered name list.
 * 2. Exact dependency-first publish-order equality (not set equality).
 * 3. Shared strict candidate-manifest loader — duplicate/extra/missing
 *    entries, path escapes, byte-hash drift, and packed-tarball identity
 *    (name/version/private/lockstep ranges) are all rejected BEFORE any
 *    publisher or verifier consumes a manifest.
 */
import { describe, expect, test } from "bun:test";
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
import {
  EXPECTED_DRY_RUN_CHECK_COUNT,
  PUBLICATION_DRY_RUN_CHECKS,
  validateDryRunChecks,
  validateExactPublishOrder,
} from "../../tools/release/dry-run-contract";
import { loadAndVerifyCandidateManifest } from "../../tools/release/candidate-manifest-loader";
import {
  PUBLISH_ORDER,
  candidateSourceIdentity,
} from "../../tools/release/pack-release";

const REPO = join(import.meta.dir, "..", "..");
const DRY_RUN_REPORT = join(REPO, "artifacts", "publish-dry-run.json");
const CANDIDATE_MANIFEST = join(
  REPO,
  "artifacts",
  "release",
  "candidate-manifest.json",
);

const hasDryRunReport = (): boolean => existsSync(DRY_RUN_REPORT);
const hasCandidateManifest = (): boolean => existsSync(CANDIDATE_MANIFEST);

interface CheckEntry {
  check: string;
  status: string;
  detail?: string;
}

interface MutableReport {
  success?: boolean;
  expectedCheckCount?: number;
  checks?: CheckEntry[];
  plan?: Record<string, unknown>;
  packages?: unknown;
  [key: string]: unknown;
}

const clone = (value: unknown): MutableReport =>
  JSON.parse(JSON.stringify(value)) as MutableReport;

describe("wave 8: canonical dry-run check contract", () => {
  test("the canonical list has 42 unique named checks", () => {
    expect(EXPECTED_DRY_RUN_CHECK_COUNT).toBe(42);
    expect(PUBLICATION_DRY_RUN_CHECKS.length).toBe(42);
    expect(new Set(PUBLICATION_DRY_RUN_CHECKS).size).toBe(42);
    expect(PUBLICATION_DRY_RUN_CHECKS[0]).toBe("pack+version-sync");
    expect(
      PUBLICATION_DRY_RUN_CHECKS[PUBLICATION_DRY_RUN_CHECKS.length - 1],
    ).toBe("cli-from-tarball");
    // Every package contributes its full per-package cycle, dependency-first.
    for (const name of PUBLISH_ORDER) {
      for (const prefix of [
        "no-unpublished-paths",
        "exports",
        "metadata",
        "readme",
      ]) {
        expect(PUBLICATION_DRY_RUN_CHECKS).toContain(`${prefix} ${name}`);
      }
    }
  });

  test("the real committed dry-run report satisfies the contract", async () => {
    if (!hasDryRunReport()) {
      console.warn("skipping — artifacts/publish-dry-run.json not built yet");
      return;
    }
    const report = await Bun.file(DRY_RUN_REPORT).json();
    const validation = validateDryRunChecks(report);
    expect(validation.problems).toEqual([]);
    expect(validation.ok).toBe(true);
  });

  test("expectedCheckCount from the JSON itself is NEVER trusted", async () => {
    if (!hasDryRunReport()) return;
    const report = await Bun.file(DRY_RUN_REPORT).json();

    for (const declared of [0, 41, 43]) {
      const mutated = clone(report);
      mutated.expectedCheckCount = declared;
      const result = validateDryRunChecks(mutated);
      expect(result.ok).toBe(false);
      expect(result.problems.join("\n")).toContain("never trusted");
    }

    // The audit's exact adversarial payload.
    const emptyPassport = {
      success: true,
      expectedCheckCount: 0,
      checks: [],
    };
    const zeroResult = validateDryRunChecks(emptyPassport);
    expect(zeroResult.ok).toBe(false);
    expect(zeroResult.problems.join("\n")).toContain("expectedCheckCount=0");
  });

  test("missing, duplicated, unknown, reordered, and failing checks are all rejected", async () => {
    if (!hasDryRunReport()) return;
    const report = await Bun.file(DRY_RUN_REPORT).json();

    // Missing one check.
    const missing = clone(report);
    missing.checks!.splice(10, 1);
    expect(validateDryRunChecks(missing).ok).toBe(false);

    // Duplicate an entry.
    const duplicated = clone(report);
    duplicated.checks!.push({ ...duplicated.checks![0]!, status: "pass" });
    const dupResult = validateDryRunChecks(duplicated);
    expect(dupResult.ok).toBe(false);
    expect(dupResult.problems.join("\n")).toContain("duplicate check names");

    // Unknown check injected under a passing status.
    const unknown = clone(report);
    unknown.checks![5]!.check = "rogue-invented-check";
    expect(validateDryRunChecks(unknown).ok).toBe(false);

    // Pure reorder: same members, wrong sequence.
    const reordered = clone(report);
    const exportIdx = 1;
    const metaIdx = 2;
    const entryA = reordered.checks![exportIdx]!;
    const entryB = reordered.checks![metaIdx]!;
    reordered.checks![exportIdx] = entryB;
    reordered.checks![metaIdx] = entryA;
    const orderResult = validateDryRunChecks(reordered);
    expect(orderResult.ok).toBe(false);
    expect(orderResult.problems.join("\n")).toContain(
      "deviates from the canonical contract",
    );

    // One failing status among otherwise-valid names.
    const failing = clone(report);
    failing.checks![3]!.status = "FAIL";
    const failResult = validateDryRunChecks(failing);
    expect(failResult.ok).toBe(false);
    expect(failResult.problems.join("\n")).toContain("non-passing status");

    // Success flipped off.
    const unsuccessful = clone(report);
    unsuccessful.success = false;
    expect(validateDryRunChecks(unsuccessful).ok).toBe(false);
  });
});

describe("wave 8: exact publish-order equality", () => {
  test("reordered and shuffled plans cannot masquerade as dependency-first", async () => {
    if (!hasDryRunReport()) return;
    const report = await Bun.file(DRY_RUN_REPORT).json();
    expect(validateExactPublishOrder(report.plan.publishOrder).ok).toBe(true);

    // The audit's example: any permutation with core first still fails.
    const bogus = [
      "@bundar/core",
      "@bundar/security",
      "create-bundar",
      "@bundar/cli",
      "@bundar/jsx",
      "@bundar/schema",
      "@bundar/forms",
      "@bundar/htmx",
      "@bundar/testing",
    ];
    const result = validateExactPublishOrder(bogus);
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toContain("position 1");
    expect(result.problems.join(" ")).toContain("@bundar/jsx");

    expect(validateExactPublishOrder([...PUBLISH_ORDER].reverse()).ok).toBe(
      false,
    );
    expect(validateExactPublishOrder(PUBLISH_ORDER.slice(0, 8)).ok).toBe(false);
    expect(validateExactPublishOrder("not-an-array").ok).toBe(false);
  });
});

describe("wave 8: shared strict candidate-manifest loader", () => {
  const loadCommittedManifest = (): Record<string, unknown> =>
    clone(JSON.parse(readFileSync(CANDIDATE_MANIFEST, "utf8")));

  const writeTempManifest = (dir: string, manifest: unknown): string => {
    const path = join(dir, "candidate-manifest.json");
    writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
    return path;
  };

  test("the committed candidate passes schema, set, containment, hash, and packed identity", () => {
    if (!hasCandidateManifest()) {
      console.warn("skipping — candidate manifest not generated yet");
      return;
    }
    const loaded = loadAndVerifyCandidateManifest({
      manifestPath: CANDIDATE_MANIFEST,
    });
    expect(loaded.errors).toEqual([]);
    expect(loaded.ok).toBe(true);
    expect(loaded.entries.map((e) => e.name)).toEqual([...PUBLISH_ORDER]);
    expect(loaded.entries.every((e) => e.actualSha256 === e.sha256)).toBe(true);
  });

  test("duplicate package entries are rejected even without exact-set mode", () => {
    if (!hasCandidateManifest()) return;
    const manifest = loadCommittedManifest();
    (manifest.packages as unknown[]) = [
      (manifest.packages as unknown[])[0],
      (manifest.packages as unknown[])[0],
    ];
    const dir = mkdtempSync(join(tmpdir(), "bundar-w8-dupe-"));
    try {
      const loaded = loadAndVerifyCandidateManifest({
        manifestPath: writeTempManifest(dir, manifest),
        requireExactPackageSet: false,
        requireContainedPaths: false,
      });
      expect(loaded.ok).toBe(false);
      const setErrors = loaded.errors.filter((e) => e.stage === "set");
      expect(
        setErrors.some((e) => /duplicate package entry/.test(e.detail)),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("extra and missing entries violate exact release-set equality", () => {
    if (!hasCandidateManifest()) return;
    const manifest = loadCommittedManifest();
    const packages = [...(manifest.packages as Array<Record<string, unknown>>)];
    manifest.packages = [
      ...packages.filter((p) => p.name !== "@bundar/cli"),
      { ...packages[0], name: "@bundar/not-a-real-package" },
    ];
    const dir = mkdtempSync(join(tmpdir(), "bundar-w8-set-"));
    try {
      const loaded = loadAndVerifyCandidateManifest({
        manifestPath: writeTempManifest(dir, manifest),
        requireContainedPaths: false,
      });
      expect(loaded.ok).toBe(false);
      const joined = loaded.errors
        .filter((e) => e.stage === "set")
        .map((e) => e.detail)
        .join("\n");
      expect(joined).toContain("missing package entry: @bundar/cli");
      expect(joined).toContain(
        "unknown package entry: @bundar/not-a-real-package",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("tarballPath values that escape the root directory are rejected", () => {
    if (!hasCandidateManifest()) return;
    const manifest = loadCommittedManifest();
    const entry = clone((manifest.packages as unknown[])[0]) as Record<
      string,
      unknown
    >;
    entry.tarballPath = "../escaped.tgz";
    entry.tarballFile = "escaped.tgz";
    manifest.packages = [entry];

    const dir = mkdtempSync(join(tmpdir(), "bundar-w8-escape-"));
    const rootDir = mkdirSync(join(dir, "root"), { recursive: true })!;
    try {
      const loaded = loadAndVerifyCandidateManifest({
        manifestPath: writeTempManifest(rootDir, manifest),
        rootDir,
        requireExactPackageSet: false,
      });
      expect(loaded.ok).toBe(false);
      expect(
        loaded.errors.some(
          (e) =>
            e.stage === "containment" &&
            /contained path|escapes/.test(e.detail),
        ),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("byte-hash drift between manifest and disk is rejected", () => {
    if (!hasCandidateManifest()) return;
    const manifest = loadCommittedManifest();
    const packages = manifest.packages as Array<Record<string, string>>;
    packages[0]!.sha256 = "0".repeat(64);
    const dir = mkdtempSync(join(tmpdir(), "bundar-w8-hashdrift-"));
    try {
      const loaded = loadAndVerifyCandidateManifest({
        manifestPath: writeTempManifest(dir, manifest),
      });
      expect(loaded.ok).toBe(false);
      const diskErrors = loaded.errors.filter((e) => e.stage === "disk");
      expect(diskErrors.some((e) => /SHA-256 mismatch/.test(e.detail))).toBe(
        true,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("packed tarball identity: wrong name, private leak, and stale internal ranges are rejected", () => {
    if (!existsSync(join(REPO, "artifacts/packages/checksums.txt"))) return;

    const dir = mkdtempSync(join(tmpdir(), "bundar-w8-packed-"));
    const caseDirs: string[] = [];
    try {
      const coreTarball = join(
        REPO,
        "artifacts",
        "packages",
        "bundar-core-0.1.0-alpha.2.tgz",
      );
      if (!existsSync(coreTarball)) {
        console.warn("skipping — candidate core tarball not built yet");
        return;
      }

      const makeCase = (
        mutatePacked: (pkgJson: Record<string, unknown>) => void,
      ): { manifestPath: string; rootDir: string } => {
        const caseDir = mkdtempSync(join(tmpdir(), "bundar-w8-case-"));
        caseDirs.push(caseDir);
        const extract = join(caseDir, "extracted");
        mkdirSync(extract, { recursive: true });
        spawnSync("tar", ["-xzf", coreTarball, "-C", extract]);
        const pkgJsonPath = join(extract, "package", "package.json");
        const packed = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
        mutatePacked(packed);
        writeFileSync(pkgJsonPath, JSON.stringify(packed, null, 2) + "\n");
        const rootDir = join(caseDir, "bundle");
        mkdirSync(rootDir, { recursive: true });
        const tarball = join(rootDir, "core-repacked.tgz");
        expect(
          spawnSync("tar", ["-czf", tarball, "-C", extract, "package"]).status,
        ).toBe(0);
        const sha256 = createHash("sha256")
          .update(readFileSync(tarball))
          .digest("hex");
        const manifestPath = join(caseDir, "candidate-manifest.json");
        writeFileSync(
          manifestPath,
          JSON.stringify(
            {
              sourceSha: "6f7f6f7f6f7f6f7f6f7f6f7f6f7f6f7f6f7f6f7f",
              version: "0.1.0-alpha.2",
              distTag: "canary",
              packages: [
                {
                  name: "@bundar/core",
                  version: "0.1.0-alpha.2",
                  tarballFile: "core-repacked.tgz",
                  tarballPath: "core-repacked.tgz",
                  sha256,
                },
              ],
            },
            null,
            2,
          ) + "\n",
        );
        return { manifestPath, rootDir };
      };

      // Positive control: the faithful repack passes packed inspection.
      const honest = makeCase(() => {});
      const honestLoad = loadAndVerifyCandidateManifest({
        manifestPath: honest.manifestPath,
        rootDir: honest.rootDir,
        requireExactPackageSet: false,
      });
      expect(honestLoad.errors.filter((e) => e.stage === "packed")).toEqual([]);

      const renamed = makeCase((packed) => {
        packed.name = "@bundar/evil-core";
      });
      const renamedLoad = loadAndVerifyCandidateManifest({
        manifestPath: renamed.manifestPath,
        rootDir: renamed.rootDir,
        requireExactPackageSet: false,
      });
      expect(renamedLoad.ok).toBe(false);
      expect(
        renamedLoad.errors.some(
          (e) =>
            e.stage === "packed" &&
            /does not match manifest entry/.test(e.detail),
        ),
      ).toBe(true);

      const privated = makeCase((packed) => {
        packed.private = true;
      });
      const privatedLoad = loadAndVerifyCandidateManifest({
        manifestPath: privated.manifestPath,
        rootDir: privated.rootDir,
        requireExactPackageSet: false,
      });
      expect(privatedLoad.ok).toBe(false);
      expect(
        privatedLoad.errors.some(
          (e) => e.stage === "packed" && /must not be private/.test(e.detail),
        ),
      ).toBe(true);

      const staleDeps = makeCase((packed) => {
        packed.dependencies = {
          ...(packed.dependencies as Record<string, string> | undefined),
          "@bundar/schema": "^0.0.0",
        };
      });
      const staleLoad = loadAndVerifyCandidateManifest({
        manifestPath: staleDeps.manifestPath,
        rootDir: staleDeps.rootDir,
        requireExactPackageSet: false,
      });
      expect(staleLoad.ok).toBe(false);
      expect(
        staleLoad.errors.some(
          (e) => e.stage === "packed" && /not lockstep/.test(e.detail),
        ),
      ).toBe(true);
    } finally {
      for (const caseDir of caseDirs) {
        rmSync(caseDir, { recursive: true, force: true });
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("publisher dry-run accepts the bundle flags and rehearses Model B publishing", () => {
    if (!hasCandidateManifest()) return;
    const headSha = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO,
      encoding: "utf8",
    }).stdout.trim();
    // Identity guard parity with the live flow: in a clean, freshly
    // regenerated checkout the committed manifest binds to HEAD. Mid-cycle
    // development trees legitimately differ — warn-and-skip there rather
    // than weakening the final-state assertions.
    const identity = candidateSourceIdentity(headSha);
    if (!identity.ok) {
      console.warn(
        `skipping — working tree is not a clean candidate-consistent checkout yet (${identity.detail})`,
      );
      return;
    }
    const result = spawnSync(
      "bun",
      [
        "tools/release/publish-approved.ts",
        "--dry-run",
        "--manifest",
        CANDIDATE_MANIFEST,
        "--tarball-root",
        REPO,
      ],
      { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    expect(result.status).toBe(0);
    expect(`${result.stdout}`).toContain("DRY-RUN complete");
  });
});
