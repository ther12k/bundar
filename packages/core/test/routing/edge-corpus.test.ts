/**
 * BR-070 route edge-case corpus: precedence, slash policy, encoding,
 * duplicates, invalid patterns, mounted prefixes — registration-time
 * failures use stable validation errors; runtime behavior is probed over
 * real sockets and pinned.
 */
import { describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import {
  normalizeRoutePath,
  RoutePathValidationError,
} from "../../src/routing/path";
import { RouteConflictError } from "../../src/routing/conflicts";

describe("BR-070 normalization policy", () => {
  const cases: [string, string | "THROW"][] = [
    ["/a", "/a"],
    ["/a/", "/a"], // trailing slash collapses
    ["//a//b", "/a/b"], // empty segments collapse
    ["/a//", "/a"],
    ["a", "THROW"], // must start with '/'
    ["", "THROW"],
    ["/a%2Fb", "THROW"], // encoded separator: fail-closed (dead-route guard)
    ["/a%5Cb", "THROW"], // encoded backslash
    ["/a\u0000b", "THROW"], // control characters
  ];

  for (const [input, expected] of cases) {
    test(`normalize ${JSON.stringify(input)} -> ${expected}`, () => {
      if (expected === "THROW") {
        expect(() => normalizeRoutePath(input)).toThrow(
          RoutePathValidationError,
        );
      } else {
        expect(normalizeRoutePath(input)).toBe(expected);
      }
    });
  }
});

describe("BR-070 registration-time conflicts", () => {
  function build(register: (app: App) => void): void {
    const app = new App();
    register(app);
    app.compile(); // conflicts throw here
  }

  test("duplicate method+path throws", () => {
    expect(() =>
      build((app) => {
        app.get("/x", () => new Response("1"));
        app.get("/x", () => new Response("2"));
      }),
    ).toThrow(RouteConflictError);
  });

  test("handler/static collision on the same path+method throws", () => {
    expect(() =>
      build((app) => {
        app.get("/y", () => new Response("h"));
        app.route("/y", ["GET"], new Response("s"));
      }),
    ).toThrow(RouteConflictError);
  });

  test("duplicate route NAME cannot produce ambiguous typed URLs", () => {
    let message = "";
    try {
      build((app) => {
        app.get("/one", () => new Response("1"), { name: "dup" });
        app.post("/two", () => new Response("2"), { name: "dup" });
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("route conflict");
    expect(message).toContain("/one");
    expect(message).toContain("/two");
  });
});

describe("BR-070 runtime precedence and encoding (live)", () => {
  function serve(): { url: string; stop: () => void } {
    const app = new App();
    app.get("/p/static", () => new Response("STATIC"));
    app.get("/p/:v", (ctx) => new Response("PARAM:" + String(ctx.params["v"])));
    app.get("/p/*", () => new Response("WILD"));
    app.get(
      "/uni/:name",
      (ctx) => new Response("name:" + String(ctx.params["name"])),
    );
    const outer = new App();
    outer.get("/nested/deep", () => new Response("nested-hit"));
    app.mount("/outer", outer.module());
    const server = Bun.serve({ ...app.compile(), port: 0 });
    return {
      url: "http://localhost:" + server.port,
      stop: () => server.stop(true),
    };
  }

  const withServer = async (
    fn: (url: string) => Promise<void>,
  ): Promise<void> => {
    const s = serve();
    try {
      await fn(s.url);
    } finally {
      s.stop();
    }
  };

  test("precedence: static beats param beats wildcard", async () => {
    await withServer(async (url) => {
      expect(await (await fetch(url + "/p/static")).text()).toBe("STATIC");
      expect(await (await fetch(url + "/p/param")).text()).toBe("PARAM:param");
      expect(await (await fetch(url + "/p/a/b/c")).text()).toBe("WILD");
    });
  });

  test("percent-decoding: params arrive decoded, traversal-safe", async () => {
    await withServer(async (url) => {
      const unicode = await (await fetch(url + "/uni/%E2%9C%94")).text();
      expect(unicode).toBe("name:\u2714");

      // encoded slash decodes INSIDE the param value (single segment)
      const slashed = await (await fetch(url + "/uni/a%2Fb")).text();
      expect(slashed).toBe("name:a/b");
    });
  });

  test("mounted prefixes compose nested paths", async () => {
    await withServer(async (url) => {
      const res = await fetch(url + "/outer/nested/deep");
      expect(await res.text()).toBe("nested-hit");
    });
  });
});
