import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// Workspace-consumer import: resolves through the root workspace symlink, not a
// relative path into src/.
import * as core from "@bundar/core";

const packageRoot = join(import.meta.dir, "..");

type Manifest = {
  name?: string;
  files?: unknown;
  dependencies?: Record<string, string>;
  exports?: Record<string, { types?: string; default?: string }>;
  engines?: Record<string, string>;
};

function readManifest(): Manifest {
  return JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  ) as Manifest;
}

describe("GH-011 @bundar/core package skeleton", () => {
  test("imports from a workspace consumer and exposes the landed runtime surface", () => {
    // Runtime surface: type-only exports (BunRouteEntry, BunRouteHandler,
    // CompiledServerOptions) do not appear at runtime.
    expect(Object.keys(core).sort()).toEqual([
      "App",
      "HTTP_METHODS",
      "RouteConflictError",
      "RoutePathValidationError",
      "RouteValidationError",
      "assertRouteConflictsFree",
      "cloneRouteDescriptor",
      "compileRoutes",
      "defaultNotFound",
      "defineModule",
      "freezeManifest",
      "isHttpMethod",
      "joinRoutePath",
      "normalizeRouteDescriptor",
      "normalizeRouteDescriptors",
      "normalizeRoutePath",
      "routeConflictKey",
      "validateRouteConflicts",
    ]);
  });

  test("published files are allow-listed", () => {
    const manifest = readManifest();
    expect(Array.isArray(manifest.files)).toBe(true);
    expect((manifest.files as string[]).length).toBeGreaterThan(0);
  });

  test("declares zero runtime dependencies", () => {
    const manifest = readManifest();
    expect(Object.keys(manifest.dependencies ?? {})).toHaveLength(0);
  });

  test("declares the Bun engine and a typed entry point", () => {
    const manifest = readManifest();
    expect(manifest.engines?.bun).toBe(">=1.4.0");
    expect(manifest.exports?.["."]?.types).toBe("./src/index.ts");
    expect(manifest.exports?.["."]?.default).toBe("./src/index.ts");
  });
});
