import { describe, expect, test } from "bun:test";
import { App } from "../src/app";
import { createContext, isContext } from "../src/context";
import type { Context } from "../src/context";

describe("GH-017 request context contract", () => {
  test("exposes the raw request and native params by reference", () => {
    const request = new Request("http://localhost/users/7?page=2");
    const params = { id: "7" };
    const context = createContext(request, params);

    expect(context.request).toBe(request);
    expect(context.params).toBe(params);
  });

  test("query access is lazy and memoized", () => {
    const context = createContext(
      new Request("http://localhost/items?sort=asc&limit=10"),
      {},
    );
    expect(context.query("sort")).toBe("asc");
    expect(context.query("limit")).toBe("10");
    expect(context.query("missing")).toBeNull();
    // URL memoization returns the same URL object
    expect(context.url).toBe(context.url);
    expect(context.url.pathname).toBe("/items");
  });

  test("cookie access parses the Cookie header once, lazily", () => {
    const context = createContext(
      new Request("http://localhost/", {
        headers: {
          cookie: "session=abc123; theme=%22dark%22; plain=hello",
        },
      }),
      {},
    );
    expect(context.cookie("session")).toBe("abc123");
    expect(context.cookie("theme")).toBe('"dark"');
    expect(context.cookie("plain")).toBe("hello");
    expect(context.cookie("absent")).toBeNull();

    const noCookies = createContext(new Request("http://localhost/"), {});
    expect(noCookies.cookie("session")).toBeNull();
  });

  test("services are frozen app-level data; state is fresh per context", () => {
    const services = Object.freeze({ db: { name: "test-db" } });
    const a = createContext(
      new Request("http://localhost/a"),
      {},
      { services },
    );
    const b = createContext(
      new Request("http://localhost/b"),
      {},
      { services },
    );

    expect(a.services).toBe(services);
    expect(b.services).toBe(services);
    expect(Object.isFrozen(a.services)).toBe(true);

    a.state.user = { id: 1 };
    expect(b.state.user).toBeUndefined();
    expect(a.state).not.toBe(b.state);
  });

  test("isContext guards the shape", () => {
    const context = createContext(new Request("http://localhost/"), {});
    expect(isContext(context)).toBe(true);
    expect(isContext(new Request("http://localhost/"))).toBe(false);
    expect(isContext(null)).toBe(false);
  });

  test("the request body is never eagerly read", () => {
    const context = createContext(
      new Request("http://localhost/", {
        method: "POST",
        body: "payload",
      }),
      {},
    );
    expect(context.request.bodyUsed).toBe(false);
  });
});

describe("GH-017 context creation only for dynamic handlers", () => {
  test("static Response routes never receive a context (no allocation)", () => {
    const app = new App();
    const response = new Response("static");
    app.route("/static", ["GET"], response);
    const compiled = app.compile();
    const entry = compiled.routes["/static"] as Record<string, unknown>;
    expect(entry["GET"]).toBe(response);
    expect(typeof entry["GET"]).toBe("object");
  });

  test("dynamic handlers receive the context as the first argument", async () => {
    let observed: Context<Record<string, string>> | undefined;
    const app = new App();
    app.get("/users/:id", (context) => {
      observed = context;
      return new Response(`user:${context.params.id}:${context.query("v")}`);
    });

    const server = app.serve({ port: 0 });
    try {
      const response = await fetch(
        `http://localhost:${server.port}/users/9?v=2`,
      );
      expect(await response.text()).toBe("user:9:2");
      expect(isContext(observed)).toBe(true);
      expect(observed?.params.id).toBe("9");
    } finally {
      server.stop(true);
    }
  });

  test("services flow from serve() into every context", async () => {
    const app = new App();
    app.get("/svc", (context) => {
      const services = context.services as { greet: (n: string) => string };
      return new Response(services.greet("world"));
    });
    const server = app.serve({
      port: 0,
      services: Object.freeze({ greet: (n: string) => `hello ${n}` }),
    });
    try {
      const response = await fetch(`http://localhost:${server.port}/svc`);
      expect(await response.text()).toBe("hello world");
    } finally {
      server.stop(true);
    }
  });
});
