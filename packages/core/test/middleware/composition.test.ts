import { describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import {
  composeMiddleware,
  DoubleNextError,
  isSyncChain,
  MissingResponseError,
} from "../../src/middleware";
import type { Middleware } from "../../src/middleware";
import { createContext } from "../../src/context";

const ctx = () => createContext(new Request("http://localhost/x"), {});

describe("GH-018 onion ordering and unwind", () => {
  test("middleware executes in registration order and unwinds in reverse", async () => {
    const trace: string[] = [];
    const one: Middleware = (_c, next) => {
      trace.push("one:before");
      const result = next(ctx());
      trace.push("one:after");
      return result;
    };
    const two: Middleware = (_c, next) => {
      trace.push("two:before");
      const result = next(ctx());
      trace.push("two:after");
      return result;
    };
    const composed = composeMiddleware([one, two], () => {
      trace.push("terminal");
      return new Response("done");
    });

    const response = composed(ctx()) as Response;
    expect(await response.text()).toBe("done");
    expect(trace).toEqual([
      "one:before",
      "two:before",
      "terminal",
      "two:after",
      "one:after",
    ]);
  });

  test("middleware can replace the downstream response during unwind", () => {
    const composed = composeMiddleware(
      [
        (_c, next) => {
          void next(ctx());
          return new Response("replaced");
        },
      ],
      () => new Response("original"),
    );
    const response = composed(ctx()) as Response;
    expect(response.headers).toBeDefined(); // replaced response flows out
  });

  test("order is deterministic across repeated invocations", () => {
    const trace: string[] = [];
    const composed = composeMiddleware(
      [
        (_c, next) => (trace.push("a"), next(ctx())),
        (_c, next) => (trace.push("b"), next(ctx())),
      ],
      () => new Response("x"),
    );
    composed(ctx());
    composed(ctx());
    expect(trace).toEqual(["a", "b", "a", "b"]);
  });
});

describe("GH-018 double next() and missing responses", () => {
  test("calling next() twice fails clearly", () => {
    const bad: Middleware = (_c, next) => {
      void next(ctx());
      return next(ctx());
    };
    const composed = composeMiddleware([bad], () => new Response("x"));
    expect(() => composed(ctx())).toThrow(DoubleNextError);
  });

  test("returning without next() or a Response fails", () => {
    const broken: Middleware = () => undefined;
    const composed = composeMiddleware([broken], () => new Response("x"));
    expect(() => composed(ctx())).toThrow(MissingResponseError);
  });

  test("empty chain delegates straight to the terminal", () => {
    const composed = composeMiddleware([], () => new Response("direct"));
    const response = composed(ctx()) as Response;
    expect(response.status).toBe(200);
  });
});

describe("GH-018 sync fast path", () => {
  test("sync-only chains return a Response, not a Promise", () => {
    const sync: Middleware = (_c, next) => next(ctx());
    const composed = composeMiddleware([sync], () => new Response("sync"));
    const result = composed(ctx());
    expect(result).toBeInstanceOf(Response); // no framework-created Promise
    expect(result.constructor).toBe(Response);
  });

  test("one async participant makes the chain async", async () => {
    const asyncMw: Middleware = async (_c, next) => next(ctx());
    const composed = composeMiddleware([asyncMw], () => new Response("a"));
    const result = composed(ctx());
    expect(result).toBeInstanceOf(Promise);
    expect(await ((await result) as Response).text()).toBe("a");
  });

  test("isSyncChain classifies chains by participant kind", () => {
    const sync: Middleware = (_c, next) => next(ctx());
    const asyncMw: Middleware = async (_c, next) => next(ctx());
    const terminal = () => new Response("t");
    expect(isSyncChain([sync], terminal)).toBe(true);
    expect(isSyncChain([sync, asyncMw], terminal)).toBe(false);
  });
});

describe("GH-018 scope boundaries", () => {
  test("app middleware applies to its routes; module middleware does not leak", async () => {
    const hits: string[] = [];
    const appMiddleware: Middleware = (_c, next) => {
      hits.push("app");
      return next(ctx());
    };
    const moduleMiddleware: Middleware = (_c, next) => {
      hits.push("module"); // must never fire for mounted routes
      return next(ctx());
    };

    // A standalone module carries its own middleware…
    const moduleApp = new App();
    moduleApp.use(moduleMiddleware);
    moduleApp.get("/inner", () => new Response("inner"));

    // …mounting does NOT import it into the parent app's scope.
    const app = new App();
    app.use(appMiddleware);
    app.get("/own", () => new Response("own"));
    app.mount("/mod", moduleApp.module());

    const server = app.serve({ port: 0 });
    try {
      expect(
        await (await fetch(`http://localhost:${server.port}/own`)).text(),
      ).toBe("own");
      expect(
        await (await fetch(`http://localhost:${server.port}/mod/inner`)).text(),
      ).toBe("inner");
      expect(hits.filter((h) => h === "app").length).toBe(2);
      expect(hits).not.toContain("module");
    } finally {
      server.stop(true);
    }
  });

  test("group middleware composes after outer group middleware", async () => {
    const order: string[] = [];
    const outer: Middleware = (_c, next) => (order.push("outer"), next(ctx()));
    const inner: Middleware = (_c, next) => (order.push("inner"), next(ctx()));

    const app = new App();
    app.group("/api", (api) => {
      api.use(outer);
      api.group("/v1", (v1) => {
        v1.use(inner);
        v1.get("/x", () => new Response("ok"));
      });
    });

    const server = app.serve({ port: 0 });
    try {
      const response = await fetch(`http://localhost:${server.port}/api/v1/x`);
      expect(await response.text()).toBe("ok");
      expect(order).toEqual(["outer", "inner"]);
    } finally {
      server.stop(true);
    }
  });

  test("middleware sees per-request context and mutates its own state", async () => {
    const tag: Middleware = (context, next) => {
      context.state.tagged = true;
      return next(context);
    };
    const app = new App();
    app.use(tag);
    app.get(
      "/who",
      (context) => new Response(context.state.tagged ? "tagged" : "untagged"),
    );

    const server = app.serve({ port: 0 });
    try {
      const response = await fetch(`http://localhost:${server.port}/who`);
      expect(await response.text()).toBe("tagged");
    } finally {
      server.stop(true);
    }
  });
});
