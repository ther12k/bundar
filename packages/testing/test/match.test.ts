/**
 * GH-074 route-matcher coverage: exact paths, `:param` segments, `*`
 * wildcard tails, method mismatch (405 with allowed methods), unknown
 * paths (404), and param injection onto requests.
 */
import { describe, expect, test } from "bun:test";
import {
  matchRoute,
  requestWithParams,
  type CompiledTableLike,
} from "../src/index";

const table: CompiledTableLike = {
  routes: {
    "/": { GET: new Response("root") },
    "/items": {
      GET: () => new Response("list"),
      POST: () => new Response("created"),
    },
    "/items/:id": { GET: () => new Response("one") },
    "/items/:id/tags/:tag": { GET: () => new Response("tagged") },
    "/files/*": { GET: () => new Response("wild") },
  },
};

describe("GH-074 matchRoute", () => {
  test("matches exact static paths", () => {
    const match = matchRoute(table, "GET", "/");
    expect(match.kind).toBe("matched");
  });

  test("extracts single params", () => {
    const match = matchRoute(table, "GET", "/items/42");
    expect(match.kind).toBe("matched");
    if (match.kind === "matched") {
      expect(match.params["id"]).toBe("42");
    }
  });

  test("extracts multiple params in order", () => {
    const match = matchRoute(table, "GET", "/items/7/tags/red");
    expect(match.kind).toBe("matched");
    if (match.kind === "matched") {
      expect(match.params["id"]).toBe("7");
      expect(match.params["tag"]).toBe("red");
    }
  });

  test("wildcard tails match multi-segment paths", () => {
    const match = matchRoute(table, "GET", "/files/a/b/c.txt");
    expect(match.kind).toBe("matched");
  });

  test("percent-encoded params are decoded", () => {
    const match = matchRoute(table, "GET", "/items/hello%20world");
    expect(match.kind).toBe("matched");
    if (match.kind === "matched") {
      expect(match.params["id"]).toBe("hello world");
    }
  });

  test("method mismatch reports 405 with allowed methods", () => {
    const match = matchRoute(table, "DELETE", "/items");
    expect(match.kind).toBe("method-not-allowed");
    if (match.kind === "method-not-allowed") {
      expect(match.allowed).toContain("GET");
      expect(match.allowed).toContain("POST");
    }
  });

  test("unknown paths report not-found (not 405)", () => {
    expect(matchRoute(table, "GET", "/missing").kind).toBe("not-found");
    expect(matchRoute(table, "GET", "/items/1/nope/deep").kind).toBe(
      "not-found",
    );
  });

  test("requestWithParams attaches params like Bun.serve", () => {
    const request = requestWithParams(new Request("http://x/items/9"), {
      id: "9",
    });
    expect(
      (request as Request & { params?: Record<string, string> }).params,
    ).toEqual({ id: "9" });
  });
});
