import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  candidateSourceIdentity,
  freshCandidateTarballPaths,
  toCandidateManifestPackage,
  type PackedCandidate,
} from "../../tools/release/pack-release";

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
});
