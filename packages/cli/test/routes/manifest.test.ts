import { describe, expect, test } from "bun:test";
import {
  App,
  buildRouteManifest,
  generateRoutesModule,
  pathParams,
} from "@bundar/core";

function namedApp() {
  const app = new App();
  app
    .get("/users/:id", () => new Response("u"), { name: "user-show" })
    .post("/users", () => new Response("c"), { name: "user-create" })
    .get("/files/*", () => new Response("f"), { name: "files" })
    .get("/health", () => new Response("h"), { name: "health" })
    .get("/unnamed", () => new Response("x"));
  return app;
}

describe("GH-073 route manifest", () => {
  test("named routes appear in registration order with params and methods", () => {
    const manifest = buildRouteManifest(namedApp().manifest());
    expect(manifest.routes.map((r) => r.name)).toEqual([
      "user-show",
      "user-create",
      "files",
      "health",
    ]);
    expect(manifest.routes[0]?.params).toEqual(["id"]);
    expect(manifest.routes[0]?.methods).toEqual(["GET"]);
    expect(manifest.routes[0]?.path).toBe("/users/:id");
  });

  test("manifest output is deterministic (no wall-clock, no randomness)", () => {
    const a = JSON.stringify(buildRouteManifest(namedApp().manifest()));
    const b = JSON.stringify(buildRouteManifest(namedApp().manifest()));
    expect(a).toBe(b);
    expect(JSON.parse(a).generatedAt).toBe("1970-01-01T00:00:00.000Z");
  });

  test("duplicate route names fail with both positions", () => {
    const app = new App();
    app.get("/a", () => new Response("a"), { name: "dup" });
    app.get("/b", () => new Response("b"), { name: "dup" });
    expect(() => buildRouteManifest(app.manifest())).toThrow(
      /positions 1 and 2/,
    );
  });

  test("pathParams extracts unique param names", () => {
    expect(pathParams("/users/:id")).toEqual(["id"]);
    expect(pathParams("/a/:x/b/:x/c")).toEqual(["x"]);
    expect(pathParams("/plain")).toEqual([]);
  });
});

describe("GH-073 generated module", () => {
  test("generation is deterministic and changes when routes change", () => {
    const base = generateRoutesModule(
      buildRouteManifest(namedApp().manifest()),
    );
    const again = generateRoutesModule(
      buildRouteManifest(namedApp().manifest()),
    );
    expect(base).toBe(again);

    const changed = new App();
    changed
      .get("/users/:id", () => new Response("u"), { name: "user-show" })
      .get("/health", () => new Response("h"), { name: "health" });
    const diff = generateRoutesModule(buildRouteManifest(changed.manifest()));
    expect(diff).not.toBe(base); // deterministic diff: removed user-create/files
  });

  test("generated module compiles as TypeScript", async () => {
    const source = generateRoutesModule(
      buildRouteManifest(namedApp().manifest()),
    );
    const path = `/tmp/routes-${Date.now()}.gen.ts`;
    await Bun.write(path, source);
    // cwd for tsc: /tmp so the repo tsconfig doesn't interfere (TS5112)
    const proc = Bun.spawnSync(
      [
        "bunx",
        "tsc",
        "--noEmit",
        "--strict",
        "--target",
        "esnext",
        "--module",
        "preserve",
        "--moduleResolution",
        "bundler",
        path,
      ],
      { cwd: "/tmp" },
    );
    expect(proc.exitCode).toBe(0);
    expect(proc.stderr.toString()).not.toContain("error TS");
  });
});
