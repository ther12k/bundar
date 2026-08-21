/**
 * GH-012 route descriptor type tests.
 *
 * The `Expect`/`Equal` members and `@ts-expect-error` blocks are enforced by
 * `tsc --noEmit` (root and package typechecks). Bun's test discovery does not
 * match `.test-d.ts` filenames, so this file is executed through its explicit
 * path (`bun test ./packages/core/test/types/route-descriptor.test-d.ts`) and
 * re-registered for normal runs by `route-descriptor.test.ts`.
 */
import { describe, expect, test } from "bun:test";
import { HTTP_METHODS, isHttpMethod } from "@bundar/core";
import type {
  HandlerRoute,
  HttpMethod,
  RouteDescriptor,
  RouteMethods,
  RouteParams,
  StaticRoute,
  ValidateRoutePath,
} from "@bundar/core";
import type { Equal, Expect } from "./type-utils";

/**
 * Route parameter inference. Each tuple element compiles only when the
 * corresponding expectation resolves to `true`; the runtime anchors below
 * keep the suite observable under `bun test`.
 */
const routeParamAssertions: [
  Expect<Equal<RouteParams<"/users">, Record<never, never>>>,
  Expect<Equal<RouteParams<"/users/:id">, { id: string }>>,
  Expect<
    Equal<
      RouteParams<"/users/:userId/posts/:postId">,
      { userId: string; postId: string }
    >
  >,
  Expect<Equal<RouteParams<"/">, Record<never, never>>>,
  Expect<Equal<RouteParams<"/assets/*">, Record<never, never>>>,
  Expect<
    Equal<
      RouteParams<"/files/:path/downloads/:name">,
      { path: string; name: string }
    >
  >,
] = [true, true, true, true, true, true];

/**
 * Documented path behavior: valid paths are `true`; unsupported patterns
 * resolve to their documented error literal.
 */
const pathValidationAssertions: [
  Expect<Equal<ValidateRoutePath<"/">, true>>,
  Expect<Equal<ValidateRoutePath<"/users/:id">, true>>,
  Expect<Equal<ValidateRoutePath<"/users/:id/posts/:postId">, true>>,
  Expect<Equal<ValidateRoutePath<"/assets/*">, true>>,
  Expect<Equal<ValidateRoutePath<"users/:id">, "path must start with '/'">>,
  Expect<
    Equal<
      ValidateRoutePath<"/*double">,
      "'*' is only allowed as a bare final segment"
    >
  >,
  Expect<
    Equal<
      ValidateRoutePath<"/a/*/b">,
      "'*' is only allowed as a bare final segment"
    >
  >,
  Expect<Equal<ValidateRoutePath<"/a//b">, "empty path segment">>,
  Expect<
    Equal<
      ValidateRoutePath<"/x/:opt?">,
      "optional parameters are not supported"
    >
  >,
  Expect<
    Equal<
      ValidateRoutePath<"/x/:opt+">,
      "optional parameters are not supported"
    >
  >,
  Expect<Equal<ValidateRoutePath<"/x/:">, "parameter name is empty">>,
] = [true, true, true, true, true, true, true, true, true, true, true];

/**
 * Method-list model: const tuples keep their literal type, duplicates
 * collapse to the documented error literal, and unbounded arrays pass
 * through (runtime validation is GH-014 scope).
 */
const methodAssertions: [
  Expect<Equal<RouteMethods<["GET"]>, ["GET"]>>,
  Expect<Equal<RouteMethods<["GET", "POST"]>, ["GET", "POST"]>>,
  Expect<
    Equal<
      RouteMethods<["GET", "GET"]>,
      "route methods must not contain duplicates"
    >
  >,
  Expect<Equal<RouteMethods<readonly HttpMethod[]>, readonly HttpMethod[]>>,
] = [true, true, true, true];

const duplicateMethodsRoute: HandlerRoute<"/dup", ["GET", "GET"]> = {
  path: "/dup",
  // @ts-expect-error the methods field collapses to the documented error type
  methods: ["GET", "GET"],
  handler: () => new Response("dup"),
};

// @ts-expect-error invalid methods are rejected by the HttpMethod constraint
const invalidMethodRoute: HandlerRoute<"/bad", ["FETCH"]> = {
  path: "/bad",
  methods: ["FETCH"],
  handler: () => new Response("bad"),
};

describe("GH-012 route descriptor type model", () => {
  test("route parameter inference suite is compiled and anchored", () => {
    expect(routeParamAssertions).toHaveLength(6);
    expect(routeParamAssertions.every((value) => value === true)).toBe(true);
  });

  test("path validation suite is compiled and anchored", () => {
    expect(pathValidationAssertions).toHaveLength(11);
    expect(pathValidationAssertions.every((value) => value === true)).toBe(
      true,
    );
  });

  test("method uniqueness suite is compiled and anchored", () => {
    expect(methodAssertions).toHaveLength(4);
    expect(methodAssertions.every((value) => value === true)).toBe(true);
  });

  test("declarations with duplicate or invalid methods stay runtime-shaped", () => {
    // These two objects carry type errors (see the @ts-expect-error blocks);
    // at runtime they are plain descriptors, which is what GH-013/GH-014
    // receive before validation rejects them. The widen is needed because the
    // duplicate `methods` field itself has the error-literal type.
    const duplicateMethods =
      duplicateMethodsRoute.methods as unknown as readonly string[];
    expect(duplicateMethods).toEqual(["GET", "GET"]);
    expect(invalidMethodRoute.methods).toEqual(["FETCH"]);
  });

  test("handler route infers literal path parameters", () => {
    const route: HandlerRoute<"/users/:id"> = {
      path: "/users/:id",
      methods: ["GET"],
      handler: (request, params) => {
        const id: string = params.id;
        return new Response(`${request.method} user ${id}`);
      },
      meta: { name: "user-detail" },
    };
    expect(route.path).toBe("/users/:id");
    expect(route.methods).toEqual(["GET"]);
    expect(route.meta).toEqual({ name: "user-detail" });
    expect(
      route.handler(new Request("http://x/users/7"), { id: "7" }),
    ).toBeInstanceOf(Response);
  });

  test("handler may return Response or Promise<Response>", async () => {
    const sync: HandlerRoute<"/sync"> = {
      path: "/sync",
      methods: ["GET"],
      handler: () => new Response("sync"),
    };
    const asyncRoute: HandlerRoute<"/async"> = {
      path: "/async",
      methods: ["POST"],
      handler: async (request) => new Response(await request.text()),
    };
    expect(sync.handler(new Request("http://x/sync"), {})).toBeInstanceOf(
      Response,
    );
    await expect(
      asyncRoute.handler(
        new Request("http://x/async", { method: "POST", body: "payload" }),
        {},
      ),
    ).resolves.toBeInstanceOf(Response);
  });

  test("static Response entries are modeled separately from handlers", () => {
    const route: StaticRoute<"/health"> = {
      path: "/health",
      methods: ["GET"],
      response: new Response("ok"),
    };
    const asDescriptor: RouteDescriptor<string> = route;
    expect(asDescriptor.response).toBeInstanceOf(Response);
    expect("handler" in route).toBe(false);
  });

  test("HTTP methods match the Bun.serve route table", () => {
    expect([...HTTP_METHODS]).toEqual([
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ]);
  });

  test("isHttpMethod guards the method union", () => {
    expect(isHttpMethod("GET")).toBe(true);
    expect(isHttpMethod("OPTIONS")).toBe(true);
    expect(isHttpMethod("FETCH")).toBe(false);
    expect(isHttpMethod("get")).toBe(false);
    expect(isHttpMethod("TRACE")).toBe(false);
    expect(isHttpMethod("CONNECT")).toBe(false);
  });
});
