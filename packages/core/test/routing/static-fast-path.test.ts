import { afterAll, describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import {
  compileRoutes,
  StaticRouteMetadataError,
  STATIC_ROUTE_FORBIDDEN_META_KEYS,
} from "../../src/routing/compiler";

/**
 * GH-016: literal `Response` route entries reach Bun unchanged — same object,
 * no wrapper closure, no Bundar machinery — and behave identically to raw Bun.
 */
const staticResponse = new Response("<p>static</p>", {
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8", "x-static": "yes" },
});

const app = new App();
app.route("/static", ["GET"], staticResponse);
app.get("/dynamic", () => new Response("dynamic"));

const compiled = app.compile();
const rawServer = Bun.serve({
  port: 0,
  routes: { "/static": staticResponse },
  fetch: () => new Response("Not Found", { status: 404 }),
});
const bundarServer = Bun.serve({ ...compiled, port: 0 });

afterAll(() => {
  rawServer.stop(true);
  bundarServer.stop(true);
});

describe("GH-016 static Response fast path", () => {
  test("object identity: the compiled entry IS the caller's Response", () => {
    const entry = compiled.routes["/static"] as Record<string, unknown>;
    expect(entry["GET"]).toBe(staticResponse);
    expect(entry["GET"]).toBe(staticResponse); // stable across reads
  });

  test("no Bundar handler closure is introduced for a pure static route", () => {
    const entry = compiled.routes["/static"] as Record<string, unknown>;
    expect(typeof entry["GET"]).toBe("object");
    expect(entry["GET"]).toBeInstanceOf(Response);
    // handler routes remain closures — the contrast case
    const dynamic = compiled.routes["/dynamic"] as Record<string, unknown>;
    expect(typeof dynamic["GET"]).toBe("function");
  });

  test("behavior matches raw Bun for status, headers, and body", async () => {
    const raw = await fetch(`http://localhost:${rawServer.port}/static`);
    const bundar = await fetch(`http://localhost:${bundarServer.port}/static`);

    expect(bundar.status).toBe(raw.status);
    expect(await bundar.text()).toBe(await raw.text());
    for (const [key, value] of raw.headers) {
      expect(bundar.headers.get(key)).toBe(value);
    }
    expect(bundar.headers.get("x-static")).toBe("yes");
  });

  test("repeated requests observe identical static behavior", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        fetch(`http://localhost:${bundarServer.port}/static`).then((r) =>
          r.text(),
        ),
      ),
    );
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe("<p>static</p>");
  });

  test("middleware-style metadata on static entries fails closed", () => {
    for (const key of STATIC_ROUTE_FORBIDDEN_META_KEYS) {
      expect(() =>
        compileRoutes([
          {
            path: "/bad",
            methods: ["GET"],
            response: new Response("x"),
            meta: { [key]: true },
          },
        ]),
      ).toThrow(StaticRouteMetadataError);
    }
    // inert metadata stays allowed
    expect(() =>
      compileRoutes([
        {
          path: "/ok",
          methods: ["GET"],
          response: new Response("x"),
          meta: { documentation: "cache-forever" },
        },
      ]),
    ).not.toThrow();
  });
});
