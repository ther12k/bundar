/**
 * GH-059 field-error rendering data: multi-error preservation, global vs
 * field separation, deterministic ordering, nested path mapping,
 * sensitive-value redaction, and safe submitted-value retention.
 */
import { describe, expect, test } from "bun:test";
import {
  redactSubmitted,
  SENSITIVE_FIELD_KEYS,
  toFieldErrors,
  type ValidationIssue,
} from "../../src/index";

function failure(
  ...issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }>
): { success: false; issues: readonly ValidationIssue[] } {
  return {
    success: false,
    issues: issues.map((issue) => ({
      message: issue.message,
      path: issue.path ?? [],
    })),
  };
}

describe("GH-059 toFieldErrors", () => {
  test("multiple errors per field are preserved in issue order", () => {
    const model = toFieldErrors(
      failure(
        { message: "too short", path: ["name"] },
        { message: "letters only", path: ["name"] },
        { message: "required", path: ["email"] },
      ),
    );
    expect(model.field("name")).toEqual(["too short", "letters only"]);
    expect(model.field("email")).toEqual(["required"]);
    expect(model.has("name")).toBe(true);
    expect(model.has("missing")).toBe(false);
    expect(model.field("missing")).toEqual([]);
  });

  test("global errors are distinct from field errors", () => {
    const model = toFieldErrors(
      failure(
        { message: "form closed" },
        { message: "required", path: ["name"] },
        { message: "submission locked" },
      ),
    );
    expect(model.global).toEqual(["form closed", "submission locked"]);
    expect(model.order).toEqual(["name"]);
  });

  test("nested paths map deliberately to dot-joined field ids", () => {
    const model = toFieldErrors(
      failure(
        { message: "invalid", path: ["items", 0, "name"] },
        { message: "invalid", path: ["items", 2, "name"] },
        { message: "bad", path: ["billing", "address"] },
      ),
    );
    expect(model.order).toEqual([
      "items.0.name",
      "items.2.name",
      "billing.address",
    ]);
    expect(model.field("items.0.name")).toEqual(["invalid"]);
  });

  test("ordering is deterministic and first-erred fields lead", () => {
    const a = toFieldErrors(
      failure(
        { message: "a1", path: ["x"] },
        { message: "b1", path: ["y"] },
        { message: "a2", path: ["x"] },
      ),
    );
    const b = toFieldErrors(
      failure(
        { message: "a1", path: ["x"] },
        { message: "b1", path: ["y"] },
        { message: "a2", path: ["x"] },
      ),
    );
    expect(a.order).toEqual(b.order);
    expect(a.first.map((e) => [e.field, e.message])).toEqual([
      ["x", "a1"],
      ["y", "b1"],
    ]);
  });

  test("empty models report empty", () => {
    const model = toFieldErrors(failure());
    expect(model.empty).toBe(true);
    expect(model.order).toEqual([]);
    expect(model.global).toEqual([]);
  });

  test("a successful result fails closed instead of rendering nonsense", () => {
    expect(() => toFieldErrors({ success: true, value: 1 } as never)).toThrow(
      TypeError,
    );
  });
});

describe("GH-059 redaction policy", () => {
  test("sensitive keys never appear in the rendered model", () => {
    const model = toFieldErrors(
      failure({ message: "required", path: ["name"] }),
      {
        submitted: {
          name: "Bundar",
          password: "hunter2",
          api_key: "sk-live-123",
          Authorization: "Bearer x",
          cvv: "123",
        },
      },
    );
    expect(model.submitted).toEqual({ name: "Bundar" });
  });

  test("custom redact keys extend the default policy", () => {
    const model = toFieldErrors(
      failure({ message: "required", path: ["nickname"] }),
      {
        submitted: { nickname: "bun", internalCode: "42" },
        redactKeys: ["internal"],
      },
    );
    expect(model.submitted).toEqual({ nickname: "bun" });
  });

  test("uploaded content and objects are never retained", () => {
    const model = toFieldErrors(
      failure({ message: "required", path: ["avatar"] }),
      {
        submitted: {
          name: "Bundar",
          avatar: { name: "avatar", bytes: new Uint8Array([1, 2, 3]) },
          resume: [1, 2, 3],
          count: 3,
          agreed: true,
        },
      },
    );
    expect(model.submitted).toEqual({
      name: "Bundar",
      count: "3",
      agreed: "true",
    });
  });

  test("redactSubmitted applies the same policy standalone", () => {
    const safe = redactSubmitted(
      {
        name: "Bundar",
        session: "abc",
        tags: ["a", "b"],
        file: new Uint8Array(4),
      },
      { redactKeys: ["tags"] },
    );
    expect(safe).toEqual({ name: "Bundar" });
  });

  test("the sensitive key list covers the documented secrets", () => {
    expect(SENSITIVE_FIELD_KEYS).toContain("password");
    expect(SENSITIVE_FIELD_KEYS).toContain("token");
    expect(SENSITIVE_FIELD_KEYS).toContain("secret");
  });
});
