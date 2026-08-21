import { describe, expect, test } from "bun:test";
import { App, defineModule, joinRoutePath } from "../src/index";

const ok = () => new Response("ok");

function paths(app: App): string[] {
  return app.manifest().routes.map((route) => route.path);
}

describe("GH-013 App builder", () => {
  test("registers verb helpers in deterministic order", () => {
    const app = new App();
    app.get("/health", ok).post("/users", ok).delete("/users/:id", ok);

    expect(paths(app)).toEqual(["/health", "/users", "/users/:id"]);
    expect(app.manifest().routes.map((route) => route.methods)).toEqual([
      ["GET"],
      ["POST"],
      ["DELETE"],
    ]);
  });

  test("groups prefixes with exactly one separator", () => {
    const app = new App();
    app.group("/api/", (group) => {
      group.group("/v1", (version) => {
        version.get("users", ok);
      });
    });

    expect(paths(app)).toEqual(["/api/v1/users"]);
    expect(joinRoutePath("/", "/")).toBe("/");
  });

  test("mounting clones routes and does not mutate the source module", () => {
    const source = new App();
    source.get("/users/:id", ok, { owner: "source" });
    const module = source.module();
    const mounted = new App().mount("/admin", module);

    expect(module.manifest().routes.map((route) => route.path)).toEqual([
      "/users/:id",
    ]);
    expect(paths(mounted)).toEqual(["/admin/users/:id"]);
    expect(module.manifest().routes[0]?.meta).toEqual({ owner: "source" });
  });

  test("module snapshots and manifests are defensive", () => {
    const route = {
      path: "/static",
      methods: ["GET"] as const,
      response: new Response("static"),
    };
    const module = defineModule([route]);
    const first = module.manifest();
    const second = module.manifest();

    expect(first).not.toBe(second);
    expect(first.routes).not.toBe(second.routes);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.routes)).toBe(true);
    expect(Object.isFrozen(first.routes[0])).toBe(true);
    expect(module.routes[0]?.path).toBe("/static");
  });
});
