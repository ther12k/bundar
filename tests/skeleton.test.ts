import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");

type PlannedPackage = {
  directory: string;
  name: string;
  allowsRuntimeDependencies: boolean;
};

/**
 * GH-001 creates the workspace skeleton only; framework behavior is out of
 * scope. These tests pin the planned repository layout from
 * engineering/repository-layout.md so later issues start from a verified base.
 */
const plannedPackages: readonly PlannedPackage[] = [
  {
    directory: "packages/core",
    name: "@bundar/core",
    allowsRuntimeDependencies: false,
  },
  {
    directory: "packages/jsx",
    name: "@bundar/jsx",
    allowsRuntimeDependencies: false,
  },
  {
    directory: "packages/htmx",
    name: "@bundar/htmx",
    allowsRuntimeDependencies: true,
  },
  {
    directory: "packages/schema",
    name: "@bundar/schema",
    allowsRuntimeDependencies: true,
  },
  {
    directory: "packages/security",
    name: "@bundar/security",
    allowsRuntimeDependencies: true,
  },
  {
    directory: "packages/testing",
    name: "@bundar/testing",
    allowsRuntimeDependencies: true,
  },
  {
    directory: "packages/cli",
    name: "@bundar/cli",
    allowsRuntimeDependencies: true,
  },
];

const plannedDirectories = [
  "create-bundar",
  "examples/minimal",
  "examples/todo",
  "examples/admin-crud",
  "fixtures/htmx2",
  "fixtures/htmx4",
  "fixtures/cross-dialect-app",
  "benchmarks/raw-bun",
  "benchmarks/hono",
  "benchmarks/bundar",
  "docs/okf",
  "scripts",
];

function readPackageJson(relativeDirectory: string): Record<string, unknown> {
  const path = join(repositoryRoot, relativeDirectory, "package.json");
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

describe("GH-001 workspace skeleton", () => {
  test("every planned directory exists", () => {
    for (const directory of plannedDirectories) {
      expect(
        existsSync(join(repositoryRoot, directory)),
        `missing directory ${directory}`,
      ).toBe(true);
    }
  });

  test("every planned public package exists with its package name and entry point", () => {
    for (const planned of plannedPackages) {
      const manifest = readPackageJson(planned.directory);
      expect(manifest["name"], `${planned.directory}/package.json name`).toBe(
        planned.name,
      );
      expect(
        existsSync(join(repositoryRoot, planned.directory, "src", "index.ts")),
        `missing ${planned.directory}/src/index.ts`,
      ).toBe(true);
    }
  });

  test("the create-bundar scaffolding package exists", () => {
    const manifest = readPackageJson("create-bundar");
    expect(manifest["name"], "create-bundar/package.json name").toBe(
      "create-bundar",
    );
    expect(
      existsSync(join(repositoryRoot, "create-bundar", "src", "index.ts")),
    ).toBe(true);
  });

  test("core and jsx declare zero runtime dependencies", () => {
    const zeroDependencyPackages = plannedPackages.filter(
      (planned) => !planned.allowsRuntimeDependencies,
    );
    for (const planned of zeroDependencyPackages) {
      const manifest = readPackageJson(planned.directory) as {
        dependencies?: Record<string, string>;
      };
      expect(
        Object.keys(manifest.dependencies ?? {}).length,
        `${planned.directory} must have zero runtime dependencies (decisions/0011-zero-runtime-deps.md)`,
      ).toBe(0);
    }
  });
});
