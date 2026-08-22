/**
 * GH-036 conformance snapshots: representative trees rendered byte-exactly
 * against a committed corpus. The snapshot file carries a `reviewedBy`
 * field that must be provided when regenerating (see
 * `bun run snapshots:jsx -- --regenerate --reviewed-by <name>`), so blind
 * updates are impossible — a mismatch fails with instructions, never
 * auto-writes.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface SnapshotFile {
  snapshotVersion: number;
  reviewedBy: string;
  regeneratedAt: string;
  cases: Record<string, string>;
}

const SNAPSHOT_PATH = join(import.meta.dir, "snapshots.json");

function loadSnapshots(): SnapshotFile {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as SnapshotFile;
}

const buildCases = (await import("./snapshot-cases")).buildCases;

describe("GH-036 conformance snapshots", () => {
  test("every case matches the committed snapshot byte for byte", async () => {
    const snapshots = loadSnapshots();
    const cases = buildCases();
    const caseNames = Object.keys(cases).sort();
    const snapshotNames = Object.keys(snapshots.cases).sort();
    expect(caseNames).toEqual(snapshotNames);

    for (const name of caseNames) {
      const rendered = await Promise.resolve(cases[name]);
      expect(rendered).toBe(snapshots.cases[name]);
    }
  });

  test("the snapshot file records an explicit review trail", () => {
    const snapshots = loadSnapshots();
    expect(snapshots.reviewedBy.length).toBeGreaterThan(0);
    expect(Number.isInteger(snapshots.snapshotVersion)).toBe(true);
  });
});
