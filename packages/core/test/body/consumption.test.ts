/**
 * BR-071 body single-consumption and content-type conformance.
 */
import { describe, expect, test } from "bun:test";
import {
  BodyConsumedError,
  MalformedBodyError,
  parseForm,
  parseFormCached,
  parseJson,
  UnsupportedMediaTypeError,
} from "../../src/request/body";
import { bodyLimitToHttpError } from "../../src/budget";
import { BodyLimitError } from "../../src/request/body";
import type { Context } from "../../src/context";

function jsonCtx(body: string, contentType = "application/json"): Context {
  return {
    request: new Request("http://t/", {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    }),
    params: {},
    state: {},
    signal: new AbortController().signal,
  } as unknown as Context;
}

function formCtx(body: string): Context {
  return jsonCtx(body, "application/x-www-form-urlencoded");
}

describe("BR-071 body consumption contract", () => {
  test("same-kind double parse throws a stable actionable error", async () => {
    const ctx = formCtx("a=1");
    await parseForm(ctx);
    await expect(parseForm(ctx)).rejects.toBeInstanceOf(BodyConsumedError);
  });

  test("cross-kind conflict NAMES the first consumer", async () => {
    const ctx = jsonCtx("{}");
    await parseJson(ctx);
    let message = "";
    try {
      await parseForm(ctx);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("already consumed by parseJson");
    expect(message).toContain("parseFormCached");
  });

  test("parseFormCached returns the SAME instance across calls", async () => {
    const ctx = formCtx("a=1&b=2");
    const first = await parseFormCached(ctx);
    const second = await parseFormCached(ctx);
    expect(second).toBe(first);
    expect(first.get("b")).toBe("2");
  });

  test("cached + direct parse conflict is also stable", async () => {
    const ctx = formCtx("a=1");
    await parseFormCached(ctx);
    await expect(parseForm(ctx)).rejects.toBeInstanceOf(BodyConsumedError);
  });

  test("unsupported media type maps to 415 with the offending header", async () => {
    const error = await parseJson(jsonCtx("x", "text/plain")).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(UnsupportedMediaTypeError);
    expect((error as UnsupportedMediaTypeError).message).toContain(
      "text/plain",
    );
  });

  test("non-UTF8 JSON charset is unsupported (RFC 8259)", async () => {
    const error = await parseJson(
      jsonCtx("x", "application/json; charset=utf-16"),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnsupportedMediaTypeError);
  });

  test("charset parameter on valid UTF-8 JSON is accepted", async () => {
    const parsed = await parseJson(
      jsonCtx('{"a":1}', "application/json; charset=utf-8"),
    );
    expect(parsed).toEqual({ a: 1 });
  });

  test("duplicate-key limit maps to the documented 400 family", () => {
    const mapped = bodyLimitToHttpError(
      new BodyLimitError("maxDuplicateKeys", "duplicate keys"),
    );
    expect(mapped.status).toBe(400);
  });

  test("limit kinds map to documented statuses", () => {
    expect(
      bodyLimitToHttpError(new BodyLimitError("timeoutMs", "slow")).status,
    ).toBe(408);
    expect(
      bodyLimitToHttpError(new BodyLimitError("maxBytes", "big")).status,
    ).toBe(413);
  });

  test("empty urlencoded body parses empty; empty JSON is malformed", async () => {
    const emptyForm = await parseForm(formCtx(""));
    expect(emptyForm.fields).toHaveLength(0);
    await expect(parseJson(jsonCtx(""))).rejects.toBeInstanceOf(
      MalformedBodyError,
    );
  });

  test("error messages never echo body values (BR-067 redaction)", async () => {
    const SECRET = "SECRET_VALUE_br071";
    let message = "";
    try {
      // Truncated JSON forces MalformedBodyError; Bun's parser message can
      // embed input fragments, so assert our redaction contract holds.
      await parseJson(jsonCtx('{"secret":"' + SECRET));
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toContain(SECRET);
  });

  test("clone() does NOT reset or consume the original body", async () => {
    const ctx = formCtx("a=1");
    void ctx.request.clone(); // tee is lazy; original stays untouched
    const parsed = await parseForm(ctx);
    expect(parsed.get("a")).toBe("1");
  });
});
