import { describe, expect, test } from "bun:test";
import {
  empty,
  file,
  html,
  json,
  redirect,
  seeOther,
  text,
  withHeaders,
} from "../../src/response";

describe("GH-021 body helpers", () => {
  test("text returns native Response with status/content-type/body", async () => {
    const response = text("hello", { status: 201, headers: { "x-a": "1" } });
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("x-a")).toBe("1");
    expect(await response.text()).toBe("hello");
  });

  test("json serializes and sets the JSON content type", async () => {
    const response = json({ ok: true, items: [1, 2] }, { status: 201 });
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(JSON.parse(await response.text())).toEqual({
      ok: true,
      items: [1, 2],
    });
  });

  test("html accepts strings only (JSX integration is GH-033)", async () => {
    const response = html("<p>hi</p>");
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(await response.text()).toBe("<p>hi</p>");
  });

  test("empty defaults to 204; 304 stays bodyless", () => {
    expect(empty().status).toBe(204);
    expect(empty().body).toBeNull();
    expect(empty({ status: 304 }).status).toBe(304);
    expect(empty({ status: 200 }).status).toBe(200);
  });

  test("file streams a Bun file with explicit type", async () => {
    const path = `/tmp/bundar-file-helper-${Date.now()}.txt`;
    await Bun.write(path, "file-body");
    const response = file(path, { type: "text/x-custom" });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/x-custom");
    expect(await response.text()).toBe("file-body");
  });
});

describe("GH-021 redirect semantics", () => {
  test("default is 302 with the location header", () => {
    const response = redirect("/go");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/go");
  });

  test("documented statuses are selectable", () => {
    expect(redirect("/a", { status: 301 }).status).toBe(301);
    expect(redirect("/a", { status: 307 }).status).toBe(307);
    expect(redirect("/a", { status: 308 }).status).toBe(308);
  });

  test("seeOther is 303 for post-action navigation", () => {
    const response = seeOther("/after");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/after");
  });
});

describe("GH-021 header composition", () => {
  test("Set-Cookie appends without collapsing", () => {
    const response = withHeaders(new Response("x"), {
      "set-cookie": ["a=1; Path=/", "b=2; Path=/"],
    });
    expect(response.headers.getSetCookie()).toEqual([
      "a=1; Path=/",
      "b=2; Path=/",
    ]);
  });

  test("Vary appends, other headers overwrite", () => {
    const base = new Response("x", {
      headers: { vary: "Accept", "x-k": "old" },
    });
    const response = withHeaders(base, { vary: "Cookie", "x-k": "new" });
    expect(response.headers.get("vary")).toBe("Accept, Cookie");
    expect(response.headers.get("x-k")).toBe("new");
  });

  test("original response is never mutated", () => {
    const original = new Response("x");
    withHeaders(original, { "x-added": "yes" });
    expect(original.headers.get("x-added")).toBeNull();
  });

  test("withHeaders preserves status and body", async () => {
    const response = withHeaders(new Response("body", { status: 201 }), {
      "x-b": "1",
    });
    expect(response.status).toBe(201);
    expect(await response.text()).toBe("body");
  });
});
