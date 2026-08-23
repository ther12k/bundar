/**
 * GH-058 source-mapping tests: form/JSON/query/params/headers extraction is
 * deterministic, single-consumption is enforced by the bounded parsers, and
 * schemas only ever see decoded plain data.
 */
import { describe, expect, test } from "bun:test";
import { BodyConsumedError, createContext, type Context } from "@bundar/core";
import {
  validateForm,
  validateHeaders,
  validateJson,
  validateParams,
  validateQuery,
} from "../src/index";
import type { StandardSchema } from "@bundar/schema";

const echoSchema: StandardSchema<unknown, Record<string, unknown>> = {
  "~standard": {
    version: 1,
    vendor: "echo",
    validate: (value) => ({ value: value as Record<string, unknown> }),
  },
};

const rejectingSchema: StandardSchema<unknown, never> = {
  "~standard": {
    version: 1,
    vendor: "reject",
    validate: () => ({ issues: [{ message: "nope", path: ["name"] }] }),
  },
};

function post(
  path: string,
  body: string,
  type: string,
): Context<Record<string, string>> {
  return createContext(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": type },
      body,
    }),
    { id: "7" },
  );
}

describe("GH-058 form source", () => {
  test("form input maps single values to strings and repeats to arrays", async () => {
    const context = post(
      "/items?z=1",
      "name=Bundar&tag=a&tag=b",
      "application/x-www-form-urlencoded",
    );
    const result = await validateForm(context, echoSchema);
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.value).toEqual({ name: "Bundar", tag: ["a", "b"] });
  });

  test("a schema cannot cause double body consumption", async () => {
    const context = post(
      "/items",
      "name=Bundar",
      "application/x-www-form-urlencoded",
    );
    await validateForm(context, echoSchema);
    // second read fails deterministically from the parser, not silently
    await expect(validateForm(context, echoSchema)).rejects.toBeInstanceOf(
      BodyConsumedError,
    );
  });

  test("validation failures carry the field path", async () => {
    const context = post(
      "/items",
      "name=Bundar",
      "application/x-www-form-urlencoded",
    );
    const result = await validateForm(context, rejectingSchema);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    expect(result.issues[0]!.path).toEqual(["name"]);
  });
});

describe("GH-058 JSON source", () => {
  test("JSON bodies parse then validate", async () => {
    const context = post("/items", '{"n":5}', "application/json");
    const result = await validateJson(context, echoSchema);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toEqual({ n: 5 });
  });

  test("JSON double consumption fails closed too", async () => {
    const context = post("/items", '{"n":5}', "application/json");
    await validateJson(context, echoSchema);
    await expect(validateJson(context, echoSchema)).rejects.toBeInstanceOf(
      BodyConsumedError,
    );
  });
});

describe("GH-058 query, params, and headers sources", () => {
  test("query input maps repeats to arrays in submission order", async () => {
    const context = createContext(
      new Request("http://localhost/items?sort=a&sort=b&page=2"),
      {},
    );
    const result = await validateQuery(context, echoSchema);
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.value).toEqual({ sort: ["a", "b"], page: "2" });
  });

  test("params input is the decoded route record", async () => {
    const context = createContext(new Request("http://localhost/users/7"), {
      id: "7",
    });
    const result = await validateParams(context, echoSchema);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toEqual({ id: "7" });
  });

  test("headers input uses lowercased keys", async () => {
    const context = createContext(
      new Request("http://localhost/", {
        headers: { "X-Custom": "yes", accept: "*/*" },
      }),
      {},
    );
    const result = await validateHeaders(context, echoSchema);
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.value).toEqual({ "x-custom": "yes", accept: "*/*" });
  });
});
