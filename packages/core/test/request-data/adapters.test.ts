import { afterAll, describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import { createContext } from "../../src/context";
import {
  CookieMutations,
  intParam,
  InvalidCookieNameError,
  param,
  queryAdapter,
  requiredParam,
  withCookies,
} from "../../src/request/adapters";

describe("GH-019 typed param access", () => {
  test("param returns undefined for absent, value for present", () => {
    const context = createContext(new Request("http://x/users/7"), { id: "7" });
    expect(param(context, "id")).toBe("7");
    expect(param(context, "missing")).toBeUndefined();
    expect(() => requiredParam(context, "missing")).toThrow(/":missing"/);
  });

  test("intParam coerces and rejects non-integers", () => {
    const context = createContext(new Request("http://x/users/42"), {
      id: "42",
    });
    expect(intParam(context, "id")).toBe(42);
    const bad = createContext(new Request("http://x/users/abc"), {
      id: "abc",
    });
    expect(() => intParam(bad, "id")).toThrow(/not an integer/);
  });

  test("Bun decoding semantics: encoded segments arrive decoded", async () => {
    let observed: Record<string, string> | undefined;
    const app = new App();
    app.get("/files/:name", (context) => {
      observed = { ...(context.params as Record<string, string>) };
      return new Response("ok");
    });
    const server = app.serve({ port: 0 });
    try {
      await fetch(
        `http://localhost:${server.port}/files/${encodeURIComponent("a b/cé")}`,
      );
      expect(observed?.name).toBe("a b/cé"); // Bun percent-decodes the match
    } finally {
      server.stop(true);
    }
  });
});

describe("GH-019 query adapter", () => {
  test("repeated keys are preserved, not collapsed", () => {
    const context = createContext(
      new Request("http://x/?tag=a&tag=b&tag=c&page=2"),
      {},
    );
    const query = queryAdapter(context);
    expect(query.getAll("tag")).toEqual(["a", "b", "c"]);
    expect(query.get("tag")).toBe("a"); // first value
    expect(query.get("page")).toBe("2");
    expect(query.has("missing")).toBe(false);
    expect(query.size).toBe(4);
  });

  test("parsing is lazy — no URL work before first access", () => {
    const context = createContext(new Request("http://x/path"), {});
    const query = queryAdapter(context);
    expect(query.size).toBe(0);
    expect(context.request.bodyUsed).toBe(false); // no body parsing anywhere
  });
});

describe("GH-019 cookie mutations", () => {
  test("set/delete queue serializes to Set-Cookie headers explicitly", () => {
    const mutations = new CookieMutations();
    mutations
      .set("session", "abc123", { httpOnly: true, secure: true, path: "/" })
      .set("theme", "dark", { maxAge: 3600, sameSite: "Lax" })
      .delete("old");

    const serialized = mutations.serialize();
    expect(serialized[0]).toBe("session=abc123; Path=/; Secure; HttpOnly");
    expect(serialized[1]).toBe("theme=dark; Max-Age=3600; SameSite=Lax");
    expect(serialized[2]).toContain("old=;");
    expect(serialized[2]).toContain("Max-Age=0");
    expect(mutations.size).toBe(3);

    const response = withCookies(new Response("body"), mutations);
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(3);
    expect(cookies[0]).toContain("session=abc123");
    expect(cookies[0]).toContain("HttpOnly");
  });

  test("withCookies never mutates the original response", () => {
    const original = new Response("x");
    const mutations = new CookieMutations().set("a", "1");
    const next = withCookies(original, mutations);
    expect(original.headers.getSetCookie()).toHaveLength(0);
    expect(next.headers.getSetCookie()).toHaveLength(1);
  });

  test("invalid cookie names and control-character values are rejected", () => {
    const mutations = new CookieMutations();
    expect(() => mutations.set("bad name", "v")).toThrow(
      InvalidCookieNameError,
    );
    expect(() => mutations.set("bad\rname", "v")).toThrow(
      InvalidCookieNameError,
    );
    expect(() => mutations.set("ok", "v\r\ninjected")).toThrow(
      InvalidCookieNameError,
    );
    expect(mutations.size).toBe(0);
  });

  test("request cookie view stays read-only and separate from mutations", () => {
    const context = createContext(
      new Request("http://x/", { headers: { cookie: "a=1" } }),
      {},
    );
    expect(context.cookie("a")).toBe("1");
    const mutations = new CookieMutations().set("b", "2");
    expect(context.cookie("b")).toBeNull(); // mutations do not leak into reads
    void mutations;
  });
});

describe("GH-019 end-to-end through a live server", () => {
  const app = new App();
  app.get("/data/:id", (context) => {
    const query = queryAdapter(context);
    const tags = query.getAll("tag").join("+");
    const mutations = new CookieMutations().set(
      "seen",
      context.params.id ?? "",
      {
        httpOnly: true,
      },
    );
    return withCookies(
      new Response(`id=${context.params.id} tags=${tags}`),
      mutations,
    );
  });
  const server = app.serve({ port: 0 });

  afterAll(() => server.stop(true));

  test("params, repeated query, and cookie mutations compose", async () => {
    const response = await fetch(
      `http://localhost:${server.port}/data/9?tag=x&tag=y`,
    );
    expect(await response.text()).toBe("id=9 tags=x+y");
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain("seen=9");
    expect(cookies[0]).toContain("HttpOnly");
  });
});
