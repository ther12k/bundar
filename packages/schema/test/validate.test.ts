/**
 * GH-058 adapter contract tests: spec conformance checking, issue
 * normalization, the raw escape hatch, sync + async validators, and
 * fail-closed dialect handling.
 */
import { describe, expect, test } from "bun:test";
import {
  SchemaDialectError,
  validateSchema,
  type StandardSchema,
  type ValidationIssue,
} from "../src/index";

/** Minimal conforming sync schema fixture (stands in for any vendor). */
function fixtureSchema(options: {
  validate: (
    value: unknown,
  ) =>
    | { value: Record<string, unknown> }
    | { issues: ReadonlyArray<{ message: string; path?: unknown[] }> };
  vendor?: string;
}): StandardSchema<unknown, Record<string, unknown>> {
  return {
    "~standard": {
      version: 1,
      vendor: options.vendor ?? "fixture",
      validate: options.validate,
    },
  } as StandardSchema<unknown, Record<string, unknown>>;
}

describe("GH-058 validateSchema contract", () => {
  test("successful validation returns the typed value", async () => {
    const schema = fixtureSchema({
      validate: (value) => ({ value: value as Record<string, unknown> }),
    });
    const result = await validateSchema(schema, { name: "Bundar" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toEqual({ name: "Bundar" });
  });

  test("issues normalize to message + PropertyKey path", async () => {
    const schema = fixtureSchema({
      validate: () => ({
        issues: [
          { message: "required", path: ["items", 0, "name"] },
          { message: "too short", path: [{ key: "email" }] },
          { message: "root-level" },
        ],
      }),
    });
    const result = await validateSchema(schema, {});
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    const paths = result.issues.map((issue) => issue.path);
    expect(paths[0]).toEqual(["items", 0, "name"]);
    expect(paths[1]).toEqual(["email"]);
    expect(paths[2]).toEqual([]);
  });

  test("library-specific details stay reachable on raw", async () => {
    const original = {
      message: "bad",
      path: ["x"],
      code: "E_CUSTOM",
      expected: 3,
    };
    const schema = fixtureSchema({
      validate: () => ({ issues: [original as never] }),
    });
    const result = await validateSchema(schema, {});
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    const issue = result.issues[0] as ValidationIssue;
    expect(issue.message).toBe("bad");
    expect((issue.raw as { code?: string })?.code).toBe("E_CUSTOM");
    expect((issue.raw as { expected?: number })?.expected).toBe(3);
  });

  test("async validators are awaited like sync ones", async () => {
    const schema: StandardSchema<unknown, number> = {
      "~standard": {
        version: 1,
        vendor: "async-fixture",
        validate: async (value) =>
          typeof value === "number"
            ? { value: value * 2 }
            : { issues: [{ message: "not a number" }] },
      },
    };
    const ok = await validateSchema(schema, 21);
    expect(ok.success && ok.value).toBe(42);
    const bad = await validateSchema(schema, "nope");
    expect(bad.success).toBe(false);
  });

  test("nonconforming schemas fail closed with SchemaDialectError", async () => {
    const notASchema = {
      validate: () => ({ value: 1 }),
    } as never as StandardSchema;
    await expect(validateSchema(notASchema, {})).rejects.toBeInstanceOf(
      SchemaDialectError,
    );
    const wrongVersion = {
      "~standard": { version: 2, vendor: "x", validate: () => ({ value: 1 }) },
    } as never as StandardSchema;
    await expect(validateSchema(wrongVersion, {})).rejects.toBeInstanceOf(
      SchemaDialectError,
    );
  });

  test("malformed validate results fail closed", async () => {
    const schema = fixtureSchema({
      validate: (() => "nope") as never,
    });
    await expect(validateSchema(schema, {})).rejects.toBeInstanceOf(
      SchemaDialectError,
    );
    const badIssues = fixtureSchema({
      validate: () => ({ issues: "nope" as never }),
    });
    await expect(validateSchema(badIssues, {})).rejects.toBeInstanceOf(
      SchemaDialectError,
    );
    const badMessage = fixtureSchema({
      validate: () => ({ issues: [{ path: [] } as never] }),
    });
    await expect(validateSchema(badMessage, {})).rejects.toBeInstanceOf(
      SchemaDialectError,
    );
  });

  test("a throwing validator propagates its error untouched", async () => {
    const boom = new Error("vendor internal");
    const schema = fixtureSchema({
      validate: (() => {
        throw boom;
      }) as never,
    });
    await expect(validateSchema(schema, {})).rejects.toThrow(boom);
  });
});
