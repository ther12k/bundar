import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  checkBoundaries,
  type BoundaryRules,
  type SourceFile,
} from "../../tools/architecture-check/engine";

const REPOSITORY_ROOT = join(import.meta.dir, "..", "..");
const rules = JSON.parse(
  readFileSync(
    join(REPOSITORY_ROOT, "tools/architecture-check/boundaries.json"),
    "utf8",
  ),
) as BoundaryRules;

function file(path: string, source: string): SourceFile {
  return { path, source };
}

describe("architecture boundary harness: forbidden dependency directions", () => {
  test("a core-to-HTMX dependency fails", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/core/src/routes.ts",
        `import { htmx2 } from "@bundar/htmx/2";\nexport { htmx2 };\n`,
      ),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("forbidden-dependency");
    expect(violations[0]?.message).toContain("@bundar/htmx/2");
  });

  test("a jsx-to-core dependency fails", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/jsx/src/render.ts",
        `export { Context } from "@bundar/core";\n`,
      ),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["forbidden-dependency"]);
  });

  test("an approved htmx-to-jsx dependency passes", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/htmx/src/adapter.ts",
        `export type { Html } from "@bundar/jsx";\n`,
      ),
    ]);
    expect(violations).toEqual([]);
  });
});

describe("architecture boundary harness: runtime dependencies", () => {
  test("a React import in a server package fails", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/jsx/src/component.tsx",
        `import { createElement } from "react";\n`,
      ),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["external-dependency"]);
  });

  test("a hydration runtime import fails", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/core/src/app.ts",
        `import { hydrateRoot } from "react-dom/client";\n`,
      ),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["external-dependency"]);
  });

  test("a dynamic external import fails too", () => {
    const violations = checkBoundaries(rules, [
      file("packages/core/src/lazy.ts", `const mod = await import("zod");\n`),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["external-dependency"]);
  });

  test("Bun and Node builtins pass", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/core/src/body.ts",
        `import { readFile } from "node:fs/promises";\nconst hash = await import("bun:sqlite");\n`,
      ),
    ]);
    expect(violations).toEqual([]);
  });
});

describe("architecture boundary harness: raw HTMX confinement", () => {
  test("raw HX-* header access outside the adapter fails", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/core/src/context.ts",
        `export function boosted(request: Request): boolean {\n  return request.headers.get("HX-Request") === "true";\n}\n`,
      ),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["raw-htmx-surface"]);
  });

  test("raw htmx lifecycle event names outside the adapter fail", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/jsx/src/events.ts",
        `export const swapEvent = "htmx:beforeSwap";\n`,
      ),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["raw-htmx-surface"]);
  });

  test("the dialect adapter package may use raw htmx strings", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/htmx/src/parse.ts",
        `export const requestHeader = "HX-Request";\nexport const event = "htmx:beforeSwap";\n`,
      ),
    ]);
    expect(violations).toEqual([]);
  });
});

describe("architecture boundary harness: relative imports", () => {
  test("a relative import escaping its package fails", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/core/src/deep/util.ts",
        `export { helper } from "../../../other/util";\n`,
      ),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["relative-escape"]);
  });

  test("relative imports inside a package pass", () => {
    const violations = checkBoundaries(rules, [
      file(
        "packages/jsx/src/escape.ts",
        `export { escapeHtml } from "./internal/html";\n`,
      ),
    ]);
    expect(violations).toEqual([]);
  });
});

describe("architecture boundary harness: real repository", () => {
  test("the actual workspace passes all frozen rules", () => {
    const files: SourceFile[] = [];
    function walk(absoluteDirectory: string): void {
      if (!statSync(absoluteDirectory).isDirectory()) return;
      for (const entry of readdirSync(absoluteDirectory, {
        withFileTypes: true,
      })) {
        const absolutePath = join(absoluteDirectory, entry.name);
        if (entry.isDirectory()) {
          walk(absolutePath);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const path = relative(REPOSITORY_ROOT, absolutePath)
            .split("\\")
            .join("/");
          if (
            Object.values(rules.packages).some((rule) =>
              path.startsWith(`${rule.path}/`),
            )
          ) {
            files.push({ path, source: readFileSync(absolutePath, "utf8") });
          }
        }
      }
    }
    walk(REPOSITORY_ROOT);
    expect(files.length).toBeGreaterThan(0);
    expect(checkBoundaries(rules, files)).toEqual([]);
  });
});
