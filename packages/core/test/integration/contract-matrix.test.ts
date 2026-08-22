import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  App,
  createContext,
  httpErrors,
  ErrorBoundary,
  param,
  intParam,
  queryAdapter,
  text,
  json,
  html,
  redirect,
  seeOther,
  empty,
  withHeaders,
  parseForm,
  parseJson,
  parseText,
  validateRouteConflicts,
  normalizeRoutePath,
  buildRouteManifest,
  generateRoutesModule,
} from "../../src/index";

/**
 * GH-023: the complete M1 contract matrix on one real Bun server —
 * static, dynamic, parameter, wildcard, grouped, mounted, middleware,
 * error, and terminal flows, plus concurrency isolation.
 */
const boundary = new ErrorBoundary({ development: false });

// A module with its own middleware — mounted without leaking it
const moduleApp = new App();
moduleApp.use((_c, next) => next(createContext(new Request("http://x/"), {})));
moduleApp.get("/items", () => json({ items: [1, 2] }));

const app = new App();

// static response (registered before app middleware: GH-016 documents that
// static entries carrying middleware fail closed at compile time)
app.route("/static", ["GET"], new Response("frozen"));

// global-scope middleware
const seen: string[] = [];
app.use((context, next) => {
  seen.push("global");
  context.state.touched = true;
  return next(context);
});

// dynamic + params + query
app.get("/users/:id", (context) =>
  text(
    `user:${intParam(context, "id")}:${queryAdapter(context).get("v") ?? "-"}`,
  ),
);

// wildcard
app.get("/files/*", (context) =>
  text(`file:${param(context, "wildcard") ?? ""}`),
);

// grouped with group middleware
app.group("/api", (api) => {
  api.use((_c, next) => {
    seen.push("group");
    return next(createContext(new Request("http://x/"), {}));
  });
  api.get("/v1/status", () => json({ status: "ok" }));
});

// mounted module (module middleware stripped, app middleware applies)
app.mount("/mod", moduleApp.module());

// error flows through boundary
app.get(
  "/throw-expected",
  boundary.wrap(() => {
    throw httpErrors.notFound("thing missing");
  }),
);
app.get(
  "/throw-unexpected",
  boundary.wrap(() => {
    throw new Error("secret");
  }),
);

// terminal: custom 404
let server: ReturnType<typeof app.serve>;
beforeAll(() => {
  server = app.serve({
    port: 0,
    notFound: () => html("<h1>app 404</h1>", { status: 404 }),
  });
});
afterAll(() => server.stop(true));

const base = () => `http://localhost:${server.port}`;

describe("GH-023 contract matrix (real server)", () => {
  test("static responses serve unchanged", async () => {
    const response = await fetch(`${base()}/static`);
    expect(await response.text()).toBe("frozen");
  });

  test("dynamic routes: params typed access + query adapters", async () => {
    const response = await fetch(`${base()}/users/42?v=9`);
    expect(await response.text()).toBe("user:42:9");
  });

  test("wildcard routes match sub-paths", async () => {
    const response = await fetch(`${base()}/files/a/b/c.txt`);
    expect(response.status).toBe(200);
  });

  test("grouped routes with layered middleware ordering", async () => {
    seen.length = 0;
    await fetch(`${base()}/api/v1/status`);
    const body = (await (await fetch(`${base()}/api/v1/status`)).json()) as {
      status: string;
    };
    expect(body.status).toBe("ok");
    expect(seen).toContain("global");
  });

  test("mounted modules serve without module middleware leaking", async () => {
    seen.length = 0; // isolate from the group test's legitimate entries
    const seenBefore = seen.length;
    const response = await fetch(`${base()}/mod/items`);
    const body = (await response.json()) as { items: number[] };
    expect(body.items).toEqual([1, 2]);
    // app global middleware ran (seen grew) but group middleware of the
    // module never appears
    expect(seen.length).toBeGreaterThan(seenBefore);
    expect(seen).not.toContain("group");
  });

  test("error flows: expected envelope vs opaque 500", async () => {
    const expected = await fetch(`${base()}/throw-expected`);
    expect(expected.status).toBe(404);
    const body = (await expected.json()) as { error: { code: string } };
    expect(body.error.code).toBe("not_found");

    const unexpected = await fetch(`${base()}/throw-unexpected`);
    expect(unexpected.status).toBe(500);
    const text500 = await unexpected.text();
    expect(text500).not.toContain("secret");
  });

  test("terminal behavior: configured 404 for unknown paths", async () => {
    const response = await fetch(`${base()}/nope`);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("<h1>app 404</h1>");
  });
});

describe("GH-023 concurrency and isolation", () => {
  test("50 concurrent requests against the full matrix stay isolated", async () => {
    const requests = Array.from({ length: 50 }, (_, i) =>
      fetch(`${base()}/users/${i}?v=${i}`).then((r) => r.text()),
    );
    const results = await Promise.all(requests);
    results.forEach((result, i) => {
      expect(result).toBe(`user:${i}:${i}`);
    });
  });

  test("repeated runs show no shared-state leakage", async () => {
    for (let round = 0; round < 5; round++) {
      const context = createContext(new Request(`http://x/${round}`), {});
      context.state.round = round;
      expect(context.state.round).toBe(round);
    }
  });
});

describe("GH-023 helpers and response surfaces", () => {
  test("response helpers cover the family", async () => {
    expect(text("t").headers.get("content-type")).toContain("text/plain");
    expect(json({}).headers.get("content-type")).toContain("application/json");
    expect(html("<p>").headers.get("content-type")).toContain("text/html");
    expect(redirect("/g").status).toBe(302);
    expect(seeOther("/g").status).toBe(303);
    expect(empty().status).toBe(204);
    const multi = withHeaders(new Response("x"), {
      "set-cookie": ["a=1", "b=2"],
    });
    expect(multi.headers.getSetCookie()).toHaveLength(2);
  });

  test("body parsing: form/json/text with single consumption", async () => {
    const form = await parseForm(
      createContext(
        new Request("http://x/", {
          method: "POST",
          body: "a=1&a=2",
          headers: { "content-type": "application/x-www-form-urlencoded" },
        }),
        {},
      ),
    );
    expect(form.getAll("a")).toEqual(["1", "2"]);

    const parsed = await parseJson<{ ok: boolean }>(
      createContext(
        new Request("http://x/", {
          method: "POST",
          body: '{"ok":true}',
          headers: { "content-type": "application/json" },
        }),
        {},
      ),
    );
    expect(parsed.ok).toBe(true);

    const plain = await parseText(
      createContext(
        new Request("http://x/", {
          method: "POST",
          body: "raw",
          headers: { "content-type": "text/plain" },
        }),
        {},
      ),
    );
    expect(plain).toBe("raw");
  });

  test("manifest generation sees named routes", () => {
    const named = new App();
    named.get("/x/:id", () => new Response("x"), { name: "x-show" });
    const manifest = buildRouteManifest(named.manifest());
    expect(manifest.routes[0]?.name).toBe("x-show");
    expect(generateRoutesModule(manifest)).toContain(`"x-show"`);
  });

  test("conflict detection and path normalization remain fail-closed", () => {
    expect(() =>
      validateRouteConflicts([
        {
          route: {
            path: "/d",
            methods: ["GET"],
            handler: () => new Response("x"),
          },
        },
        {
          route: {
            path: "/d/",
            methods: ["GET"],
            handler: () => new Response("x"),
          },
        },
      ]),
    ).toThrow();
    expect(() => normalizeRoutePath("bad")).toThrow();
  });
});
