/**
 * GH-072 dev command unit coverage: entry resolution (explicit flag/arg,
 * conventional candidates, fail-closed diagnostics) and child argv shape.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { devChildArgs, resolveDevEntry } from "../../src/commands/dev";

function withTempDir(fn: (dir: string) => void): void {
  const dir = join(
    tmpdir(),
    `bundar-dev-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("GH-072 resolveDevEntry", () => {
  test("explicit --entry wins and resolves against cwd", () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, "my-app.ts"), "export {};");
      const result = resolveDevEntry([], { entry: "my-app.ts" }, dir);
      expect("error" in result ? result.error : result.entry).toBe(
        join(dir, "my-app.ts"),
      );
    });
  });

  test("positional arg works like --entry", () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, "positional.ts"), "export {};");
      const result = resolveDevEntry(["positional.ts"], {}, dir);
      expect("error" in result).toBe(false);
    });
  });

  test("missing explicit entry fails closed with the path in the message", () => {
    const result = resolveDevEntry(
      [],
      { entry: "nope.ts" },
      "/definitely/missing",
    );
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("nope.ts");
  });

  test("conventional candidates are discovered in order", () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src", "app.ts"), "export {};");
      const result = resolveDevEntry([], {}, dir);
      expect("error" in result ? result.error : result.entry).toBe(
        join(dir, "src", "app.ts"),
      );
    });
  });

  test("no entry at all produces an actionable diagnostic", () => {
    withTempDir((dir) => {
      const result = resolveDevEntry([], {}, dir);
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("--entry");
        expect(result.error).toContain("src/app.ts");
      }
    });
  });
});

describe("GH-072 devChildArgs", () => {
  test("hot flag + entry, no port by default", () => {
    expect(devChildArgs({ entry: "/app/src/app.ts" })).toEqual([
      "--hot",
      "/app/src/app.ts",
    ]);
  });

  test("port is a runtime flag, not a script argument", () => {
    expect(devChildArgs({ entry: "/app.ts", port: 3000 })).toEqual([
      "--hot",
      "--port",
      "3000",
      "/app.ts",
    ]);
  });
});
