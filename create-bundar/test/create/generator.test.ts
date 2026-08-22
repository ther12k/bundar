/**
 * GH-071 scaffolding unit coverage: dialect selection (default htmx2,
 * explicit experimental), target validation (never overwrite), name
 * validation, generated file set, and the experimental notice text.
 */
import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createProject,
  HTMX4_EXPERIMENTAL_NOTICE,
  ScaffoldError,
} from "../../src/index";

function tempTarget(name: string): string {
  return join(
    tmpdir(),
    `bundar-scaffold-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
}

const EXPECTED_FILES = [
  "package.json",
  "tsconfig.json",
  "src/dialect.ts",
  "src/layout.tsx",
  "src/app.ts",
  "src/main.ts",
  "src/app.test.ts",
  "README.md",
  ".gitignore",
];

describe("GH-071 createProject", () => {
  test("default dialect is stable htmx2; full file set generated", () => {
    const target = tempTarget("default");
    const result = createProject({ target, dialect: "htmx2" });
    expect(result.dialect).toBe("htmx2");
    expect([...result.files].sort()).toEqual([...EXPECTED_FILES].sort());
    expect(existsSync(join(result.directory, "src/main.ts"))).toBe(true);
    rmSync(target, { recursive: true, force: true });
  });

  test("htmx2 template imports the stable adapter and carries no banner", () => {
    const target = tempTarget("v2");
    const result = createProject({ target, dialect: "htmx2" });
    const dialectFile = readFileSync(
      join(result.directory, "src/dialect.ts"),
      "utf8",
    );
    expect(dialectFile).toContain("@bundar/htmx/2");
    expect(dialectFile).not.toContain("EXPERIMENTAL");
    rmSync(target, { recursive: true, force: true });
  });

  test("experimental dialect: exact pin, banner, and notice", () => {
    const target = tempTarget("v4");
    const result = createProject({ target, dialect: "htmx4-experimental" });
    const dialectFile = readFileSync(
      join(result.directory, "src/dialect.ts"),
      "utf8",
    );
    expect(dialectFile).toContain("@bundar/htmx/4");
    expect(dialectFile).toContain("EXPERIMENTAL");
    expect(dialectFile).toContain("4.0.0-beta6");
    // the CLI-facing notice states no GA claim
    expect(HTMX4_EXPERIMENTAL_NOTICE).toContain("EXPERIMENTAL");
    expect(HTMX4_EXPERIMENTAL_NOTICE).toContain("No GA compatibility claim");
    rmSync(target, { recursive: true, force: true });
  });

  test("refuses non-empty targets (no overwrite)", () => {
    const target = tempTarget("occupied");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "user-file.txt"), "precious");
    expect(() => createProject({ target, dialect: "htmx2" })).toThrow(
      ScaffoldError,
    );
    expect(readFileSync(join(target, "user-file.txt"), "utf8")).toBe(
      "precious",
    );
    rmSync(target, { recursive: true, force: true });
  });

  test("refuses invalid project names", () => {
    expect(() =>
      createProject({ target: "/tmp/x", name: "Not A Name", dialect: "htmx2" }),
    ).toThrow(ScaffoldError);
  });

  test("unknown dialect fails closed", () => {
    expect(() =>
      createProject({
        target: tempTarget("bad"),
        dialect: "htmx9" as never,
      }),
    ).toThrow(ScaffoldError);
  });

  test("generated package metadata: pinned Bun engine, workspace deps, no React", () => {
    const target = tempTarget("meta");
    const result = createProject({ target, dialect: "htmx2" });
    const pkg = JSON.parse(
      readFileSync(join(result.directory, "package.json"), "utf8"),
    );
    expect(pkg.engines.bun).toBe(">=1.4.0");
    expect(Object.keys(pkg.dependencies)).toEqual(
      expect.arrayContaining(["@bundar/core", "@bundar/jsx", "@bundar/htmx"]),
    );
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(Object.keys(allDeps).some((key) => /react/i.test(key))).toBe(false);
    rmSync(target, { recursive: true, force: true });
  });

  test("generated source contains no React/hydration runtime", () => {
    const target = tempTarget("nosreact");
    const result = createProject({ target, dialect: "htmx2" });
    for (const file of result.files) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      const source = readFileSync(join(result.directory, file), "utf8");
      expect(source.includes("react")).toBe(false);
    }
    rmSync(target, { recursive: true, force: true });
  });
});
