/**
 * GH-021 type tests: the handler contract stays `Response | Promise<Response>`.
 * Arbitrary convenience returns (strings, objects, numbers) must be type
 * errors — there is no implicit conversion.
 */
import { describe, expect, test } from "bun:test";
import type { Equal, Expect } from "../types/type-utils";
import type { HandlerRoute, RouteHandler } from "../../src/routing/types";

describe("GH-021 explicit return contract (compile-time)", () => {
  test("helpers return native Response", () => {
    const route: HandlerRoute<"/a"> = {
      path: "/a",
      methods: ["GET"],
      // @ts-expect-error string returns are not the handler contract
      handler: () => "plain string",
    };
    void route;
    expect(true).toBe(true); // anchored by tsc; runtime no-op
  });

  test("returning arbitrary objects is a type error", () => {
    const route: HandlerRoute<"/b"> = {
      path: "/b",
      methods: ["GET"],
      // @ts-expect-error object returns are not the handler contract
      handler: () => ({ json: "like" }),
    };
    void route;
    expect(true).toBe(true);
  });

  test("Response and Promise<Response> remain the only contract", () => {
    type Allowed = ReturnType<RouteHandler>;
    const check: Expect<Equal<Allowed, Response | Promise<Response>>> = true;
    void check;
    expect(true).toBe(true);
  });
});
