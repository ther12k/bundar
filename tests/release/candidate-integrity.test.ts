import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
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
