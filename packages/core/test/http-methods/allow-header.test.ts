import { describe, expect, test } from "bun:test";
import { buildAllowHeader, fillMethodGaps } from "../../src/routing/methods";
import { HTTP_METHODS, type HttpMethod } from "../../src/routing/types";

describe("BR-069 buildAllowHeader", () => {
  test("is sorted and deduplicated", () => {
    // Set insertion order is POST, GET on purpose - the header must not
    // depend on registration order.
    const allow = buildAllowHeader(new Set<HttpMethod>(["POST", "GET"]));
    expect(allow).toBe("GET, HEAD, OPTIONS, POST");
  });

  test("includes HEAD only when GET is registered", () => {
    expect(buildAllowHeader(new Set<HttpMethod>(["GET"]))).toBe(
      "GET, HEAD, OPTIONS",
    );
    expect(buildAllowHeader(new Set<HttpMethod>(["POST"]))).toBe(
      "OPTIONS, POST",
    );
  });

  test("always includes OPTIONS even for an empty registration", () => {
    expect(buildAllowHeader(new Set<HttpMethod>())).toBe("OPTIONS");
  });

  test("an explicit HEAD registration without GET does not imply GET", () => {
    const allow = buildAllowHeader(new Set<HttpMethod>(["HEAD"]));
    expect(allow).toBe("HEAD, OPTIONS");
  });
});

describe("BR-069 fillMethodGaps", () => {
  test("adds 405 with Allow for every unregistered method on a GET-only path", () => {
    const group: Record<string, unknown> = { GET: () => new Response("ok") };
    fillMethodGaps(group);

    for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
      const entry = group[method];
      expect(entry).toBeInstanceOf(Response);
      const response = entry as Response;
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
    }
  });

  test("does not synthesize HEAD when GET is registered - Bun answers it natively", () => {
    const group: Record<string, unknown> = { GET: () => new Response("ok") };
    fillMethodGaps(group);
    expect(group.HEAD).toBeUndefined();
  });

  test("synthesizes a 405 for HEAD when there is no GET to imply it from", () => {
    const group: Record<string, unknown> = { POST: () => new Response("ok") };
    fillMethodGaps(group);
    expect(group.HEAD).toBeInstanceOf(Response);
    expect((group.HEAD as Response).status).toBe(405);
  });

  test("adds an automatic 204 OPTIONS response when none is registered", () => {
    const group: Record<string, unknown> = { GET: () => new Response("ok") };
    fillMethodGaps(group);
    const options = group.OPTIONS as Response;
    expect(options).toBeInstanceOf(Response);
    expect(options.status).toBe(204);
    expect(options.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
  });

  test("never overrides an explicit registration, including explicit OPTIONS", () => {
    const explicitOptions = new Response("custom-options");
    const explicitPost = () => new Response("custom-post");
    const group: Record<string, unknown> = {
      GET: () => new Response("ok"),
      OPTIONS: explicitOptions,
      POST: explicitPost,
    };
    fillMethodGaps(group);
    expect(group.OPTIONS).toBe(explicitOptions);
    expect(group.POST).toBe(explicitPost);
  });

  test("fills every declared HTTP method for a path registered with none", () => {
    const group: Record<string, unknown> = {};
    fillMethodGaps(group);
    for (const method of HTTP_METHODS) {
      expect(group[method]).toBeInstanceOf(Response);
    }
    expect((group.OPTIONS as Response).status).toBe(204);
    expect((group.GET as Response).status).toBe(405);
  });

  test("Allow is identical across every synthesized entry for one path", () => {
    const group: Record<string, unknown> = { GET: () => new Response("ok") };
    fillMethodGaps(group);
    const allows = new Set(
      Object.values(group)
        .filter((entry): entry is Response => entry instanceof Response)
        .map((response) => response.headers.get("Allow")),
    );
    expect(allows.size).toBe(1);
    expect([...allows][0]).toBe("GET, HEAD, OPTIONS");
  });
});
