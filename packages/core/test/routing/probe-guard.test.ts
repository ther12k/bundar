/**
 * BR-097 (#149): no PROBE-style ad-hoc debug branches on the production
 * compiler path. The `process.env.PROBE` console.error in the compiled
 * request path was removed (second re-review wave, commit 1126876); this
 * guard keeps every @bundar/core source file free of that pattern so it
 * cannot quietly return. Real debug observability would land as a
 * documented, tested hook instead.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function coreSources(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...coreSources(full));
    else if (entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

describe("BR-097 no PROBE debug branches in core sources", () => {
  test("@bundar/core/src contains no process.env.PROBE or console.error debug branches", () => {
    const srcDirectory = join(import.meta.dir, "..", "..", "src");
    const offenders = coreSources(srcDirectory).filter((file) => {
      const text = readFileSync(file, "utf8");
      return (
        text.includes("PROBE") ||
        /if\s*\(.*\)\s*\n?\s*console\.error\(/.test(text)
      );
    });
    expect(offenders).toEqual([]);
  });
});
