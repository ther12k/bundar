/** GH-080: the guide snippet modules RUN (imported here, executed in CI). */
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dir, "..", "..", "docs", "snippets", "guides");

describe("GH-080 guide snippets execute", () => {
  for (const file of readdirSync(DIR).filter((name) => name.endsWith(".ts"))) {
    test(`docs/snippets/guides/${file}`, async () => {
      const module = await import(join(DIR, file));
      expect(module).toBeDefined();
    });
  }
});
