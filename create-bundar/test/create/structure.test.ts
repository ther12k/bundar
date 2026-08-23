/**
 * BR-024/BR-025 scaffolding structure coverage: feature preset file set,
 * deterministic regeneration, dry-run manifest, and unknown-structure
 * failure.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkAppBoundaries } from "../../../tools/app-architecture/engine";
import { createProject, DEFAULT_STRUCTURE } from "../../src/index";

function tempTarget(name: string): string {
  return join(
    tmpdir(),
    `bundar-structure-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
}

const FEATURE_FILES = [
  ".gitignore",
  "README.md",
  "package.json",
  // sorted() puts tsconfig.json between README.md and src/* — keep list in
  // the same order the assertion compares against:
  "src/app.ts",
  "src/features/subscribe/AGENTS.md",
  "src/features/subscribe/subscribe.actions.ts",
  "src/features/subscribe/subscribe.routes.ts",
  "src/features/subscribe/subscribe.schema.ts",
  "src/features/subscribe/subscribe.test.ts",
  "src/features/subscribe/subscribe.types.ts",
  "src/features/subscribe/subscribe.view.tsx",
  "src/layout.tsx",
  "src/main.ts",
  "src/platform/dialect.ts",
  "tsconfig.json",
];

describe("BR-025 --structure feature", () => {
  test("default structure is compact (documented default)", () => {
    expect(DEFAULT_STRUCTURE).toBe("compact");
  });

  test("feature preset generates the canonical ADR-0019 tree", () => {
    const target = tempTarget("feature-tree");
    try {
      const result = createProject({
        target,
        dialect: "htmx2",
        structure: "feature",
      });
      expect([...result.files].sort()).toEqual(FEATURE_FILES);
      expect(result.structure).toBe("feature");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("repeated generation is byte-identical apart from nothing (name fixed)", () => {
    const a = tempTarget("det-a");
    const b = tempTarget("det-b");
    try {
      const first = createProject({
        target: a,
        dialect: "htmx2",
        structure: "feature",
      });
      // same name → identical bytes; different directory only
      const second = createProject({
        target: b,
        dialect: "htmx2",
        structure: "feature",
        name: a.split("/").pop()!,
      });
      for (const filePath of first.files) {
        expect(readFileSync(join(a, filePath), "utf8")).toBe(
          readFileSync(join(b, filePath), "utf8"),
        );
      }
      expect(second.files.length).toBe(first.files.length);
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  });

  test("the generated feature tree passes the BR-023 boundary checker", () => {
    const target = tempTarget("arch-ok");
    try {
      const result = createProject({
        target,
        dialect: "htmx2",
        structure: "feature",
      });
      const violations = checkAppBoundaries(
        { root: "src", mode: "feature-sliced" },
        result.files.map((filePath) => ({
          path: filePath,
          source: readFileSync(join(target, filePath), "utf8"),
        })),
      );
      expect(violations).toEqual([]);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("dry run renders without writing and exposes contents", () => {
    const target = tempTarget("dry");
    try {
      const result = createProject({
        target,
        dialect: "htmx2",
        structure: "feature",
        dryRun: true,
      });
      expect(result.files.length).toBe(FEATURE_FILES.length);
      expect(Object.keys(result.contents)).toHaveLength(FEATURE_FILES.length);
      expect(result.contents["src/app.ts"]).toContain(
        "registerSubscribeRoutes",
      );
      // nothing was written
      expect(existsSync(target)).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  test("unknown structure values fail with a clear error", () => {
    expect(() =>
      createProject({
        target: tempTarget("bad"),
        dialect: "htmx2",
        structure: "bogus" as never,
      }),
    ).toThrow(/unknown structure/);
  });
});
