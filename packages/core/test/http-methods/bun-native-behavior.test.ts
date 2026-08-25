/**
 * BR-069 (#137) Bun-native behavior fixture: pins how PLAIN `Bun.serve`
 * — with no Bundar layer at all — answers HEAD, unregistered methods, and
 * unknown paths. `compiler.ts` fills the 405/Allow/auto-OPTIONS gaps on
 * top of this contract; if Bun ever changes it upstream (for example by
 * answering OPTIONS or 405 natively), this fixture fails loudly so the
 * fill-in policy can be reclassified instead of silently double-layering.
 */
import { afterAll, describe, expect, test } from "bun:test";

let fallbacks = 0;

// Explicit per-method object form — the exact shape Bundar's compiler
// emits (`routeTable[path][METHOD] = handler`). See the last test for
// why the bare-handler form is deliberately never used.
const server = Bun.serve({
  port: 0,
  routes: {
    "/page": {
      GET: () => new Response("page-body", { headers: { "x-kind": "get" } }),
    },
    "/users/:id": {
      GET: (request) => new Response("user:" + new URL(request.url).pathname),
    },
  },
  fetch: () => {
    fallbacks += 1;
    return new Response("fallback", { status: 404 });
  },
});

// Bare-handler form: method-agnostic (ANY registered-path request runs it).
const bareServer = Bun.serve({
  port: 0,
  routes: {
    "/bare": () => new Response("bare-body"),
  },
  fetch: () => new Response("fallback", { status: 404 }),
});

const base = "http://localhost:" + server.port;
const bareBase = "http://localhost:" + bareServer.port;

afterAll(() => {
  server.stop(true);
  bareServer.stop(true);
});

describe("BR-069 plain Bun.serve native method behavior (Bun 1.4.0)", () => {
  test("HEAD is satisfied from the registered GET handler, body stripped", async () => {
    const res = await fetch(base + "/page", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-kind")).toBe("get");
    expect(await res.text()).toBe("");
  });

  test("GET on an unknown path falls through to fetch (404, no Allow)", async () => {
    const res = await fetch(base + "/definitely-missing");
    expect(res.status).toBe(404);
    expect(res.headers.get("allow")).toBe(null);
    expect(await res.text()).toBe("fallback");
  });

  test("an UNREGISTERED method on a KNOWN static path is indistinguishable from an unknown path", async () => {
    // This is the native gap Bundar's compiler fills with 405 + Allow:
    // natively there is no 405, no Allow, no automatic OPTIONS — the
    // request simply falls through to fetch like a bad path would.
    const post = await fetch(base + "/page", { method: "POST" });
    expect(post.status).toBe(404);
    expect(post.headers.get("allow")).toBe(null);

    const options = await fetch(base + "/page", { method: "OPTIONS" });
    expect(options.status).toBe(404);
    expect(options.headers.get("allow")).toBe(null);
  });

  test("the same fallthrough applies to parameterized paths", async () => {
    const res = await fetch(base + "/users/7", { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(res.headers.get("allow")).toBe(null);
  });

  test("native parameter extraction on GET still works (sanity)", async () => {
    const res = await fetch(base + "/users/7");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("user:/users/7");
  });

  test("the BARE handler form is method-agnostic — any method runs it", async () => {
    // Why Bundar's compiler always emits the explicit per-method map:
    // a bare handler would let POST/DELETE/PATCH silently run the GET
    // handler instead of receiving the 405 the compiler fills in.
    const get = await fetch(bareBase + "/bare");
    expect(get.status).toBe(200);
    expect(await get.text()).toBe("bare-body");

    const post = await fetch(bareBase + "/bare", { method: "POST" });
    expect(post.status).toBe(200);
    expect(await post.text()).toBe("bare-body");
  });

  test("exactly the four fallthrough probes hit the fetch handler", () => {
    // POST, OPTIONS, DELETE + the unknown-path GET — nothing else may
    // fall through: HEAD must be answered natively, never by fetch.
    expect(fallbacks).toBe(4);
  });
});
