import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { App, buildRouteManifest, generateRoutesModule } from "@bundar/core";
import { app } from "./entry";

/**
 * GH-073 consumer fixture: generate the module from the app, import it,
 * and exercise generated URLs against a live server — proving generated
 * URLs match server routes end-to-end.
 */
const manifest = buildRouteManifest(app.manifest());
const source = generateRoutesModule(manifest);
// Unique per-run module path defeats Bun's module cache so the freshly
// generated source is always what gets imported.
const genFile = join(
  import.meta.dir,
  `routes.gen.${Date.now()}-${Math.random().toString(36).slice(2)}.ts`,
);
await Bun.write(genFile, source);
const generated = (await import(genFile)) as {
  urls: Record<string, (params?: unknown, query?: unknown) => string>;
};
const urls = generated.urls;
const urlFor = (
  name: string,
): ((params?: unknown, query?: unknown) => string) => {
  const builder = urls[name];
  if (typeof builder !== "function") {
    throw new Error(`generated builder "${name}" missing`);
  }
  return builder;
};

const server = app.serve({ port: 0 });
const base = `http://localhost:${server.port}`;

afterAll(() => server.stop(true));

describe("GH-073 consumer: generated URLs match server routes", () => {
  test("params are encoded and the route resolves", async () => {
    const url = urlFor("user-show")({ id: "a b/cé" });
    expect(url).toBe(`/users/${encodeURIComponent("a b/cé")}`);
    const response = await fetch(base + url);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("user:a b/cé");
  });

  test("query objects serialize with repeated array values", async () => {
    const url = urlFor("search")({}, { tag: ["x", "y"], page: 2 });
    expect(url).toBe(`/search?tag=x&tag=y&page=2`);
    const response = await fetch(base + url);
    expect(await response.text()).toBe("search:x");
  });

  test("missing required params throw at runtime (typecheck rejects earlier)", () => {
    expect(() => urlFor("user-show")({} as Record<string, never>)).toThrow(
      /missing required path parameter "id"/,
    );
  });

  test("param-less routes need no arguments", () => {
    expect(urlFor("search")()).toBe("/search");
  });
});

describe("GH-073 stale-generation detection", () => {
  test("regenerating produces identical bytes (not stale)", () => {
    const regenerated = generateRoutesModule(
      buildRouteManifest(app.manifest()),
    );
    expect(regenerated).toBe(source);
  });

  test("changing a named route produces a deterministic diff", async () => {
    const changed = new App();
    changed.get(
      "/users/:userId",
      (context) => new Response(`u:${context.params.userId}`),
      { name: "user-show" },
    );
    const diff = generateRoutesModule(buildRouteManifest(changed.manifest()));
    expect(diff).not.toBe(source);
    expect(diff).toContain("userId");
    expect(source).toContain("id: string | number");
    // deterministic: same change, same bytes
    const diff2 = generateRoutesModule(buildRouteManifest(changed.manifest()));
    expect(diff).toBe(diff2);
  });
});
