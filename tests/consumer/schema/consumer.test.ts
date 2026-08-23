/**
 * GH-058 consumer runtime test: Zod 4 and Valibot 1 — two independent,
 * real-world Standard Schema validators — run through the Bundar adapter
 * against real request contexts (form, query, JSON), including failure
 * normalization with library details preserved.
 */
import { describe, expect, test } from "bun:test";
import { createContext, type Context } from "@bundar/core";
import { validateForm, validateJson, validateQuery } from "@bundar/forms";
import { valibotPayload, valibotSearch, zodUser } from "./fixture";

function form(body: string): Context<Record<string, string>> {
  return createContext(
    new Request("http://localhost/register", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }),
    {} as Record<string, string>,
  );
}

describe("GH-058 zod consumer", () => {
  test("form data validates with validator-owned coercion", async () => {
    const result = await validateForm(
      form("name=Bundar&email=team%40bundar.invalid&age=3"),
      zodUser,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe("Bundar");
      expect(result.value.age).toBe(3); // coerced from "3" by zod
    }
  });

  test("zod failures normalize with paths and keep library details", async () => {
    const result = await validateForm(
      form("name=&email=not-an-email&age=999"),
      zodUser,
    );
    expect(result.success).toBe(false);
    if (result.success) throw new Error("unreachable");
    const paths = result.issues.map((issue) => issue.path.join("."));
    expect(paths).toContain("name");
    expect(paths).toContain("email");
    expect(paths).toContain("age");
    // escape hatch: zod's original issue objects stay reachable
    const raw = result.issues[0]!.raw as { code?: string } | undefined;
    expect(raw).toBeDefined();
  });
});

describe("GH-058 valibot consumer", () => {
  test("query params validate through a second independent validator", async () => {
    const context = createContext(
      new Request("http://localhost/search?q=bundar&page=2"),
      {},
    );
    const result = await validateQuery(context, valibotSearch);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.q).toBe("bundar");
      expect(result.value.page).toBe("2");
    }
  });

  test("valibot defaults apply and failures carry paths", async () => {
    const withDefault = await validateQuery(
      createContext(new Request("http://localhost/search?q=bundar"), {}),
      valibotSearch,
    );
    expect(withDefault.success).toBe(true);
    if (withDefault.success) expect(withDefault.value.page).toBe("1");

    const failing = await validateQuery(
      createContext(new Request("http://localhost/search?page=x"), {}),
      valibotSearch,
    );
    expect(failing.success).toBe(false);
    if (failing.success) throw new Error("unreachable");
    expect(failing.issues[0]!.path).toEqual(["q"]);
  });

  test("JSON bodies validate with typed array output", async () => {
    const context = createContext(
      new Request("http://localhost/things", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: 7, tags: ["a", "b"] }),
      }),
      {},
    );
    const result = await validateJson(context, valibotPayload);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.tags).toEqual(["a", "b"]);
  });
});
