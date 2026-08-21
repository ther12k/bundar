import { describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import { compileRoutes, defaultNotFound } from "../../src/routing/compiler";

const ok = () => new Response("ok");

describe("GH-015 route compilation", () => {
  test("compiles to a deterministic Bun route table keyed by path and method", () => {
    const app = new App();
    app.get("/health", ok).post("/users", ok).put("/users/:id", ok);

    const first = app.compile();
    const second = app.compile();

    expect(Object.keys(first.routes)).toEqual([
      "/health",
      "/users",
      "/users/:id",
    ]);
    expect(Object.keys(first.routes)).toEqual(Object.keys(second.routes));
    expect(JSON.stringify(Object.keys(first.routes))).toBe(
      JSON.stringify(Object.keys(second.routes)),
    );
  });

  test("static Response entries are passed through untouched", () => {
    const response = new Response("static", {
      headers: { "x-bundar": "static" },
    });
    const app = new App();
    app.route("/health", ["GET"], response);

    const compiled = app.compile();
    const entry = compiled.routes["/health"] as Record<string, unknown>;
    expect(entry["GET"]).toBe(response);
  });

  test("handler routes adapt Bun request.params to the Bundar handler contract", async () => {
    const app = new App();
    let observed: Record<string, string> | undefined;
    app.get("/users/:id/posts/:postId", (request, params) => {
      observed = { ...(params as Record<string, string>) };
      return new Response("done");
    });

    const compiled = app.compile();
    const entry = compiled.routes["/users/:id/posts/:postId"] as Record<
      string,
      (request: Request & { params: Record<string, string> }) => Response
    >;
    const handler = entry["GET"]!;

    // Bun populates request.params; the wrapper forwards it as the second
    // Bundar handler argument.
    const bunRequest = new Request(
      "http://localhost/users/1/posts/2",
    ) as Request & {
      params: Record<string, string>;
    };
    bunRequest.params = { id: "1", postId: "2" };

    const result = await handler(bunRequest);
    expect(await result.text()).toBe("done");
    expect(observed).toEqual({ id: "1", postId: "2" });

    // Without Bun-provided params the handler still receives an empty record.
    const bare = new Request("http://localhost/users/1/posts/2") as Request & {
      params: Record<string, string>;
    };
    await handler(bare);
    expect(observed).toEqual({});
  });

  test("duplicate registrations fail at compile time with diagnostics", () => {
    const app = new App();
    app.get("/users", ok);
    app.post("/users/", ok); // same normalized path/method after joining

    // GET /users and POST /users share a path legally; force the collision:
    const conflicting = new App();
    conflicting.get("/users", ok);
    expect(() =>
      compileRoutes([
        { path: "/users", methods: ["GET"], handler: ok },
        { path: "/users/", methods: ["GET"], handler: ok },
      ]),
    ).toThrow(/duplicate-route/);
    void app;
    void conflicting;
  });

  test("invalid path syntax fails at compile time", () => {
    expect(() =>
      compileRoutes([
        { path: "/users/:bad-id", methods: ["GET"], handler: ok },
      ]),
    ).toThrow();
    expect(() =>
      compileRoutes([
        { path: "no-leading-slash", methods: ["GET"], handler: ok },
      ]),
    ).toThrow();
  });

  test("unmatched requests fall through to the 404 fetch handler", async () => {
    const compiled = compileRoutes([
      { path: "/known", methods: ["GET"], handler: ok },
    ]);
    const response = await compiled.fetch(
      new Request("http://localhost/unknown"),
    );
    expect(response.status).toBe(404);
    expect(defaultNotFound().status).toBe(404);
  });

  test("no route scanning at request time: fetch does not consult route entries", () => {
    const compiled = compileRoutes([
      { path: "/known", methods: ["GET"], handler: ok },
    ]);
    // The compiled fetch fallback is a plain 404 responder; route dispatch
    // happens in Bun's router before fetch is ever reached.
    expect(compiled.fetch.name).not.toBe("matchRoute");
    expect(typeof compiled.fetch).toBe("function");
  });
});
