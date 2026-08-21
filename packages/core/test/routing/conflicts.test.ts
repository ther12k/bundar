import { describe, expect, test } from "bun:test";
import {
  RouteConflictError,
  RouteValidationError,
  assertRouteConflictsFree,
  validateRouteConflicts,
} from "../../src/index";

const handler = () => new Response("ok");
const staticRoute = (path: string) => ({
  path,
  methods: ["GET"] as const,
  response: new Response("ok"),
});

describe("GH-014 route conflicts", () => {
  test("rejects duplicate normalized path/method pairs", () => {
    expect(() =>
      validateRouteConflicts([
        {
          route: { path: "/users", methods: ["GET"], handler },
          source: "users.ts:1",
        },
        {
          route: { path: "/users/", methods: ["GET"], handler },
          source: "users.ts:2",
        },
      ]),
    ).toThrow(RouteConflictError);

    try {
      validateRouteConflicts([
        {
          route: { path: "/users", methods: ["GET"], handler },
          source: "/home/alice/users.ts:1",
        },
        {
          route: { path: "/users/", methods: ["GET"], handler },
          source: "/home/alice/users.ts:2",
        },
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(RouteConflictError);
      expect((error as RouteConflictError).message).not.toContain(
        "/home/alice",
      );
      expect((error as RouteConflictError).message).toContain("<path>");
    }
  });

  test("allows method-specific routes to share a path", () => {
    expect(() =>
      assertRouteConflictsFree([
        { route: { path: "/users", methods: ["GET"], handler } },
        { route: { path: "/users/", methods: ["POST"], handler } },
      ]),
    ).not.toThrow();
  });

  test("rejects handler/static replacement on the same method", () => {
    expect(() =>
      validateRouteConflicts([
        {
          route: { path: "/health", methods: ["GET"], handler },
          source: "handler",
        },
        { route: staticRoute("/health"), source: "static" },
      ]),
    ).toThrow(/handler-static-mismatch/);
  });

  test("rejects duplicate methods and invalid dynamic methods", () => {
    expect(() =>
      validateRouteConflicts([
        {
          route: {
            path: "/duplicate",
            methods: ["GET", "GET"] as unknown as readonly never[],
            handler,
          },
        },
      ]),
    ).toThrow(RouteConflictError);

    expect(() =>
      validateRouteConflicts([
        {
          route: {
            path: "/invalid",
            methods: ["FETCH"] as unknown as readonly never[],
            handler,
          },
        },
      ]),
    ).toThrow(RouteValidationError);
  });
});
