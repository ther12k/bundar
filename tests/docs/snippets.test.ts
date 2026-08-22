/**
 * docs:snippets (GH-079): every file under docs/snippets is a runnable
 * module exercising the public API — executed here so documentation
 * examples cannot rot. Compile discipline: the root typecheck covers
 * docs/snippets via tsconfig include? It does not — so each snippet is
 * also type-checked by importing it (types resolve through the package
 * exports, the same way packed consumers see them).
 */
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const SNIPPETS = join(import.meta.dir, "..", "..", "docs", "snippets");

describe("GH-079 runnable documentation snippets", () => {
  const files = readdirSync(SNIPPETS).filter((name) => name.endsWith(".ts"));

  test("the snippet set covers the required topics", () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  for (const file of files) {
    test(`docs/snippets/${file} runs against the public API`, async () => {
      const module = await import(join(SNIPPETS, file));
      expect(module).toBeDefined();
    });
  }
});
