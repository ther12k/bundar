import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  candidateSourceIdentity,
  freshCandidateTarballPaths,
  toCandidateManifestPackage,
  validateCandidateManifestPackage,
  type PackedCandidate,
} from "../../tools/release/pack-release";
import { normalizeDistTags } from "../../tools/release/registry-verify-utils";
import { purl } from "../../tools/release/sbom-utils";
import { withIdentityLock } from "./identity-lock";

describe("BR-112 candidate integrity", () => {
  test("validation selects fresh candidate bytes, never the persisted path", () => {
    const dir = mkdtempSync(join(tmpdir(), "bundar-br112-"));
    const freshPath = join(dir, "fresh.tgz");
    const persistedPath = join(dir, "persisted.tgz");
    writeFileSync(freshPath, "fresh candidate bytes");
    writeFileSync(persistedPath, "stale persisted bytes");

    const candidate = {
      name: "@bundar/core",
      version: "0.1.0-alpha.2",
      tarballFile: "bundar-core-0.1.0-alpha.2.tgz",
      tarballPath: "artifacts/packages/bundar-core-0.1.0-alpha.2.tgz",
      absolutePath: freshPath,
      sha256: "candidate-digest",
    } satisfies PackedCandidate;

    try {
      const selected = freshCandidateTarballPaths(
        new Map([[candidate.name, candidate]]),
      );
      expect(selected.get(candidate.name)).toBe(freshPath);
      expect(selected.get(candidate.name)).not.toBe(persistedPath);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("current source identity rejects uncommitted package-affecting changes", async () => {
    const sourceSha = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: join(import.meta.dir, "../.."),
      encoding: "utf8",
    }).stdout.trim();
    const sourceFile = join(
      import.meta.dir,
      "../../packages/core/src/index.ts",
    );
    await withIdentityLock(async () => {
      const original = await Bun.file(sourceFile).text();
      try {
        writeFileSync(sourceFile, `${original}\n// BR-112 test mutation\n`);
        const identity = candidateSourceIdentity(sourceSha);
        expect(identity.ok).toBe(false);
        expect(identity.detail).toContain(
          "uncommitted package-affecting changes",
        );
      } finally {
        writeFileSync(sourceFile, original);
      }
    });
  });

  test("manifest validation rejects machine-specific unknown fields, missing fields, and non-strings", () => {
    const valid = {
      name: "@bundar/core",
      version: "0.1.0-alpha.2",
      tarballFile: "bundar-core-0.1.0-alpha.2.tgz",
      tarballPath: "artifacts/packages/bundar-core-0.1.0-alpha.2.tgz",
      sha256: "candidate-digest",
    };
    expect(validateCandidateManifestPackage(valid)).toEqual({
      ok: true,
      detail: "exact portable package fields",
    });

    const withAbsolute = {
      ...valid,
      absolutePath: "/home/runner/work/bundar/artifacts/packages/core.tgz",
    };
    const unknownRes = validateCandidateManifestPackage(withAbsolute);
    expect(unknownRes.ok).toBe(false);
    expect(unknownRes.detail).toContain("unknown fields: absolutePath");

    const missingRes = validateCandidateManifestPackage({
      name: "@bundar/core",
      version: "0.1.0-alpha.2",
    });
    expect(missingRes.ok).toBe(false);
    expect(missingRes.detail).toContain(
      "missing fields: tarballFile, tarballPath, sha256",
    );

    const nonStringRes = validateCandidateManifestPackage({
      ...valid,
      sha256: 12345,
    });
    expect(nonStringRes.ok).toBe(false);
    expect(nonStringRes.detail).toContain("non-string fields: sha256");

    expect(validateCandidateManifestPackage(null).ok).toBe(false);
  });

  test("candidateSourceIdentity rejects malformed SHAs", () => {
    expect(candidateSourceIdentity("not-a-sha").ok).toBe(false);
    expect(candidateSourceIdentity("12345").detail).toContain("malformed");
  });

  test("normalizes flat and nested npm dist-tag responses", () => {
    expect(normalizeDistTags({ canary: "0.1.0-alpha.2" })).toEqual({
      canary: "0.1.0-alpha.2",
    });
    expect(
      normalizeDistTags({ distTags: { canary: "0.1.0-alpha.2" } }),
    ).toEqual({ canary: "0.1.0-alpha.2" });
    expect(normalizeDistTags([])).toBeUndefined();
  });

  test("candidate SBOM references use the canonical encoded npm PURL", () => {
    expect(purl("@bundar/core", "0.1.0-alpha.2")).toBe(
      "pkg:npm/%40bundar/core@0.1.0-alpha.2",
    );
  });

  test("manifest serialization omits machine-specific absolute paths", () => {
    const serialized = toCandidateManifestPackage({
      name: "@bundar/core",
      version: "0.1.0-alpha.2",
      tarballFile: "bundar-core-0.1.0-alpha.2.tgz",
      tarballPath: "artifacts/packages/bundar-core-0.1.0-alpha.2.tgz",
      absolutePath: "/home/runner/work/bundar/artifacts/packages/core.tgz",
      sha256: "candidate-digest",
    });

    expect(serialized).toEqual({
      name: "@bundar/core",
      version: "0.1.0-alpha.2",
      tarballFile: "bundar-core-0.1.0-alpha.2.tgz",
      tarballPath: "artifacts/packages/bundar-core-0.1.0-alpha.2.tgz",
      sha256: "candidate-digest",
    });
    expect(JSON.stringify(serialized)).not.toContain("absolutePath");
    expect(JSON.stringify(serialized)).not.toContain("/home/runner");
  });

  test("publish-dry-run records expectedCheckCount and success flag", async () => {
    const reportPath = join(
      import.meta.dir,
      "../../artifacts/publish-dry-run.json",
    );
    if (await Bun.file(reportPath).exists()) {
      const data = await Bun.file(reportPath).json();
      expect(data.success).toBe(true);
      expect(data.expectedCheckCount).toBe(42);
      expect(Array.isArray(data.checks)).toBe(true);
      expect(data.checks.length).toBe(42);
      expect(
        data.checks.every((c: { status: string }) => c.status === "pass"),
      ).toBe(true);
    }
  });

  test("registry:verify preflight writes structured report", () => {
    const preflightResult = spawnSync(
      "bun",
      ["tools/release/registry-verify.ts", "--preflight"],
      {
        cwd: join(import.meta.dir, "../.."),
        encoding: "utf8",
      },
    );
    expect(preflightResult.status).toBe(0);
    const reportPath = join(
      import.meta.dir,
      "../../artifacts/registry-verify.json",
    );
    const report = JSON.parse(
      spawnSync("cat", [reportPath], { encoding: "utf8" }).stdout,
    );
    expect(report.mode).toBe("preflight");
    expect(report.success).toBe(true);
    expect(Array.isArray(report.packages)).toBe(true);
    expect(report.packages.length).toBe(9);
    expect(report.packages[0].status).toBe("pass");
  });

  test("release:verify fails when dry-run report indicates failure", async () => {
    const reportPath = join(
      import.meta.dir,
      "../../artifacts/publish-dry-run.json",
    );
    const original = await Bun.file(reportPath).text();
    const mutated = JSON.parse(original);
    mutated.success = false;
    mutated.checks[0].status = "fail";
    try {
      writeFileSync(reportPath, JSON.stringify(mutated, null, 2));
      const verifyResult = spawnSync("bun", ["tools/release/verify.ts"], {
        cwd: join(import.meta.dir, "../.."),
        encoding: "utf8",
      });
      expect(verifyResult.status).not.toBe(0);
      expect(verifyResult.stdout + verifyResult.stderr).toContain(
        "dry-run-checks-pass",
      );
    } finally {
      writeFileSync(reportPath, original);
    }
  });
});
