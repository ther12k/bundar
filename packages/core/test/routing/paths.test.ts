import { describe, expect, test } from "bun:test";
import { RoutePathValidationError, normalizeRoutePath } from "../../src/index";

describe("GH-014 route path normalization", () => {
  test("normalizes root, repeated separators, and trailing slash", () => {
    expect(normalizeRoutePath("/")).toBe("/");
    expect(normalizeRoutePath("/api//users/")).toBe("/api/users");
    expect(normalizeRoutePath("/api/users")).toBe("/api/users");
  });

  test("preserves a supported bare trailing wildcard", () => {
    expect(normalizeRoutePath("/assets/*")).toBe("/assets/*");
  });

  test("rejects unsupported or ambiguous syntax", () => {
    const invalid = [
      "",
      "users",
      "/users/:",
      "/users/:id?",
      "/users/:id+",
      "/users/*rest/more",
      "/users/pre*fix",
      "/a:b",
      "/users/:not-valid",
    ];

    for (const path of invalid) {
      expect(() => normalizeRoutePath(path)).toThrow(RoutePathValidationError);
    }
  });
});
