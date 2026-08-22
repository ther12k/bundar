import { describe, expect, test } from "bun:test";
import { jsx, jsxs } from "../src/jsx-runtime";
import {
  renderToString,
  renderToStringAsync,
  renderToStringAuto,
} from "../src/render-to-string";
import { AsyncComponentError } from "../src/render/node";

describe("GH-033 renderToString contract", () => {
  test("synchronous trees return synchronously (string, no Promise)", () => {
    const tree = jsx("div", { id: "x", children: "text" });
    const result = renderToString(tree);
    expect(typeof result).toBe("string");
    expect(result).toBe(`<div id="x">text</div>`);
  });

  test("sync output has no Promise involvement", () => {
    const result = renderToString(
      jsxs("ul", { children: [jsx("li", { children: 1 })] }),
    );
    expect(result).toBe(`<ul><li>1</li></ul>`);
    expect(result.constructor).toBe(String);
  });

  test("async trees throw with guidance in the sync API", () => {
    const Async = async () => jsx("p", { children: "later" });
    expect(() => renderToString(jsx(Async, {}))).toThrow(AsyncComponentError);
  });

  test("renderToStringAsync resolves async trees without corruption", async () => {
    const Slow = async () =>
      jsx("b", {
        children: await new Promise((r) => setTimeout(() => r("slow"), 5)),
      });
    const Fast = async () => jsx("i", { children: "fast" });
    const tree = jsxs("div", {
      children: [jsx(Slow, {}), jsx(Fast, {}), "tail"],
    });
    expect(await renderToStringAsync(tree)).toBe(
      `<div><b>slow</b><i>fast</i>tail</div>`,
    );
  });

  test("renderToStringAsync handles promised children", async () => {
    const tree = jsx("p", {
      children: [Promise.resolve("a"), " ", Promise.resolve("b")],
    });
    expect(await renderToStringAsync(tree)).toBe(`<p>a b</p>`);
  });

  test("renderToStringAuto selects the right path", async () => {
    const syncResult = renderToStringAuto(jsx("p", { children: "s" }));
    expect(typeof syncResult).toBe("string");

    const Async = async () => jsx("p", { children: "a" });
    const asyncResult = renderToStringAuto(
      jsx("div", { children: jsx(Async, {}) }),
    );
    expect(asyncResult).toBeInstanceOf(Promise);
    expect(await asyncResult).toBe(`<div><p>a</p></div>`);
  });
});
