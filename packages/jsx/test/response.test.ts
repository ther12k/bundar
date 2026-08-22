import { describe, expect, test } from "bun:test";
import { jsx } from "../src/jsx-runtime";
import { document } from "../src/document";
import { fragment, page } from "../src/response";

describe("GH-033 response integration", () => {
  test("fragment returns a native Response with UTF-8 HTML content type", async () => {
    const response = fragment(jsx("p", { children: "hi <>" }));
    expect(response).toBeInstanceOf(Response);
    const resolved = await Promise.resolve(response);
    expect(resolved.status).toBe(200);
    expect(resolved.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(await resolved.text()).toBe(`<p>hi &lt;&gt;</p>`);
  });

  test("status and user headers compose safely", async () => {
    const response = await Promise.resolve(
      fragment(jsx("p", { children: "x" }), {
        status: 201,
        headers: { "x-custom": "yes" },
      }),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("x-custom")).toBe("yes");
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
  });

  test("explicit content-type override is preserved", async () => {
    const response = await Promise.resolve(
      fragment("plain", {
        headers: { "content-type": "text/html" },
      }),
    );
    expect(response.headers.get("content-type")).toBe("text/html");
  });

  test("page renders full documents with doctype", async () => {
    const tree = document({
      lang: "en",
      title: "T",
      children: jsx("p", { children: "body" }),
    });
    const response = await Promise.resolve(page(tree));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain(`<title>T</title>`);
    expect(html).toContain(`<p>body</p>`);
  });

  test("page with async trees resolves with doctype intact", async () => {
    const Async = async () => jsx("p", { children: "async-body" });
    const tree = jsx("html", {
      children: jsx("body", { children: jsx(Async, {}) }),
    });
    const response = await page(tree);
    const html = await response.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("async-body");
  });

  test("page rejects trees without exactly one html root", async () => {
    const fragmentTree = jsx("p", { children: "not a document" });
    await expect(page(fragmentTree)).rejects.toThrow(/document root/);
  });

  test("async fragments return Promises that resolve to Responses", async () => {
    const Async = async () => jsx("b", { children: "late" });
    const result = fragment(jsx("div", { children: jsx(Async, {}) }));
    expect(result).toBeInstanceOf(Promise);
    const response = await result;
    expect(await response.text()).toBe(`<div><b>late</b></div>`);
  });
});
