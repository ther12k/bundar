/**
 * BR-002 regression probe: middleware chains must be composed ONCE per
 * compiled route/method entry at startup (GH-018 contract), not rebuilt for
 * each request.
 *
 * The probe distinguishes composition count (composer invocations, observed
 * through the onMiddlewareComposition seam) from middleware execution count
 * (ordinary next() traffic), and asserts both independently:
 *
 * - composition: exactly one event per compiled handler route/method whose
 *   chain is non-empty, regardless of how many requests are served;
 * - execution: exactly once per request per chain participant;
 * - routes with no middleware — static Response entries and dynamic handlers
 *   without any scope middleware — never reach the composer at all.
 */

import { describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import { onMiddlewareComposition } from "../../src/composition-seam";
import type { Middleware } from "../../src/middleware";

function countingMiddleware(name: string): Middleware & { count(): number } {
  let executions = 0;
  const mw = ((_context, next) => {
    executions += 1;
    return next(_context);
  }) as Middleware & { count(): number };
  mw.count = () => executions;
  void name;
  return mw;
}

const request = (path: string) => new Request(`http://localhost${path}`);

type RouteGroup = Record<string, CallableFunction>;

async function drive(
  entry: RouteGroup,
  method: string,
  path: string,
  times: number,
) {
  const handler = entry[method];
  if (!handler) throw new Error(`no ${method} entry compiled for ${path}`);
  for (let i = 0; i < times; i += 1) {
    await handler(request(path));
  }
}

describe("BR-002 middleware composition count", () => {
  test("chains compose once at compile and execute once per request", async () => {
    const globalMw = countingMiddleware("global");
    const groupMw = countingMiddleware("group");
    const moduleMw = countingMiddleware("module");
    const routeMw = countingMiddleware("route");
    const asyncMw = countingMiddleware("async");

    const app = new App();
    app.use(globalMw);

    app.get("/global", () => new Response("ok"));

    app.group("/api", (api) => {
      api.use(groupMw);
      api.get("/status", () => new Response("ok"));
    });

    const moduleApp = new App();
    moduleApp.use(moduleMw);
    moduleApp.get("/items", () => new Response("ok"));
    app.mount("/mod", moduleApp.module());

    // Module middleware is stripped at mount (scope boundary); the mounting
    // app's chain applies instead, so the mounted route composes [global].
    app.get("/local", () => new Response("ok"), { middleware: [routeMw] });
    app.get("/async", async () => new Response("ok"), {
      middleware: [asyncMw],
    });

    const compiled = app.compile();

    const compositions: number[] = [];
    const off = onMiddlewareComposition((count) => compositions.push(count));

    try {
      const REQUESTS = 5;

      await drive(
        compiled.routes["/global"] as RouteGroup,
        "GET",
        "/global",
        REQUESTS,
      );
      await drive(
        compiled.routes["/api/status"] as RouteGroup,
        "GET",
        "/api/status",
        REQUESTS,
      );
      await drive(
        compiled.routes["/mod/items"] as RouteGroup,
        "GET",
        "/mod/items",
        REQUESTS,
      );
      await drive(
        compiled.routes["/local"] as RouteGroup,
        "GET",
        "/local",
        REQUESTS,
      );
      await drive(
        compiled.routes["/async"] as RouteGroup,
        "GET",
        "/async",
        REQUESTS,
      );

      // GH-018: exactly one composition per non-empty compiled chain — five
      // dynamic routes here — no matter how many requests were served.
      expect(compositions).toEqual([1, 2, 1, 2, 2]);

      // Execution is orthogonal: every participant runs once per request that
      // traverses its scope.
      expect(globalMw.count()).toBe(REQUESTS * 5);
      expect(groupMw.count()).toBe(REQUESTS);
      // Stripped at mount: module middleware never executes post-mount.
      expect(moduleMw.count()).toBe(0);
      expect(routeMw.count()).toBe(REQUESTS);
      expect(asyncMw.count()).toBe(REQUESTS);
    } finally {
      off();
    }
  });

  test("static responses and middleware-free routes never compose", async () => {
    const app = new App();
    app.route("/static", ["GET"], new Response("frozen"));
    app.get("/plain", () => new Response("ok"));

    const compiled = app.compile();

    const compositions: number[] = [];
    const off = onMiddlewareComposition((count) => compositions.push(count));
    try {
      const staticEntry = (compiled.routes["/static"] as RouteGroup).GET;
      if (!(staticEntry instanceof Response)) {
        throw new Error("static entry should be passed to Bun by reference");
      }
      await staticEntry.text();

      await drive(compiled.routes["/plain"] as RouteGroup, "GET", "/plain", 3);

      expect(compositions).toEqual([]);
    } finally {
      off();
    }
  });
});
