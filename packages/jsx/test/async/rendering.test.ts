import { describe, expect, test } from "bun:test";
import { jsx, jsxs, Fragment } from "../../src/jsx-runtime";
import { renderNode } from "../../src/render/node";
import {
  AbortedRenderError,
  AsyncComponentRenderError,
  renderNodeAsync,
  renderNodeAuto,
} from "../../src/render/async";

const delay = <T>(ms: number, value: T): Promise<T> =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

describe("GH-030 sync fast path", () => {
  test("fully synchronous trees render through the sync path", () => {
    const tree = jsxs("ul", {
      children: [jsx("li", { children: "a" }), jsx("li", { children: "b" })],
    });
    const result = renderNodeAuto(tree);
    expect(typeof result).toBe("string"); // no Promise
    expect(result).toBe(`<ul><li>a</li><li>b</li></ul>`);
  });

  test("sync renderNodeAuto output equals renderNode output", () => {
    const tree = jsx("div", { id: "x", children: "text" });
    expect(renderNodeAuto(tree)).toBe(renderNode(tree));
  });
});

describe("GH-030 async components and promised children", () => {
  test("async components resolve and render", async () => {
    const AsyncTitle = async () =>
      jsx("h1", { children: await delay(5, "late") });
    const tree = jsx("div", { children: jsx(AsyncTitle, {}) });
    const result = await renderNodeAsync(tree);
    expect(result).toBe(`<div><h1>late</h1></div>`);
  });

  test("promised children (raw promises in the tree) resolve", async () => {
    const tree = jsxs("p", {
      children: [delay(1, "first"), " ", delay(5, "second")],
    });
    expect(await renderNodeAsync(tree)).toBe(`<p>first second</p>`);
  });

  test("sibling async components render in document order regardless of timing", async () => {
    // second resolves first in wall-clock time; output order stays document order
    const Slow = async () => jsx("b", { children: await delay(40, "slow") });
    const Fast = async () => jsx("i", { children: await delay(1, "fast") });
    const tree = jsxs("div", { children: [jsx(Slow, {}), jsx(Fast, {})] });
    expect(await renderNodeAsync(tree)).toBe(
      `<div><b>slow</b><i>fast</i></div>`,
    );
  });

  test("renderNodeAuto switches to async only when async is present", async () => {
    const Async = async () => jsx("p", { children: "x" });
    const syncTree = jsx("p", { children: "sync" });
    const asyncTree = jsx("div", { children: jsx(Async, {}) });

    const syncResult = renderNodeAuto(syncTree);
    expect(typeof syncResult).toBe("string");

    const asyncResult = renderNodeAuto(asyncTree);
    expect(asyncResult).toBeInstanceOf(Promise);
    expect(await asyncResult).toBe(`<div><p>x</p></div>`);
  });

  test("nested async inside fragments and arrays", async () => {
    const Inner = async () => {
      const node = await delay(2, jsx("em", { children: "deep" }));
      return node;
    };
    const tree = jsxs(Fragment, {
      children: [[jsx(Inner, {})], delay(3, "tail")],
    });
    expect(await renderNodeAsync(tree)).toBe(`<em>deep</em>tail`);
  });

  test("element attributes serialize while children resolve", async () => {
    const tree = jsx("section", {
      id: "s",
      class: "wide",
      children: delay(2, "content"),
    });
    expect(await renderNodeAsync(tree)).toBe(
      `<section class="wide" id="s">content</section>`,
    );
  });
});

describe("GH-030 rejection propagation", () => {
  test("async component rejection carries component context", async () => {
    const Broken = async () => {
      throw new Error("db down");
    };
    try {
      await renderNodeAsync(jsx(Broken, {}));
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AsyncComponentRenderError);
      expect((error as AsyncComponentRenderError).component).toBe("Broken");
      expect((error as Error).message).toContain("db down");
    }
  });

  test("promised-child rejection propagates", async () => {
    const rejecting = Promise.reject(new Error("child failed"));
    await expect(
      renderNodeAsync(jsx("p", { children: rejecting })),
    ).rejects.toThrow(/child failed/);
  });

  test("sync component throwing inside an async tree keeps attribution", async () => {
    function SyncBoom(): never {
      throw new Error("sync boom");
    }
    const tree = jsxs("div", {
      children: [delay(1, "a"), jsx(SyncBoom, {})],
    });
    await expect(renderNodeAsync(tree)).rejects.toThrow(
      AsyncComponentRenderError,
    );
  });
});

describe("GH-030 abort propagation", () => {
  test("aborting mid-render stops unbounded work", async () => {
    const controller = new AbortController();
    let steps = 0;
    const Counting = async () => {
      steps++;
      return jsx("p", { children: await delay(50, `step${steps}`) });
    };
    const tree = jsxs("div", {
      children: [jsx(Counting, {}), jsx(Counting, {}), jsx(Counting, {})],
    });

    const promise = renderNodeAsync(tree, { signal: controller.signal });
    setTimeout(() => controller.abort(new Error("client gone")), 10);
    await expect(promise).rejects.toThrow(AbortedRenderError);
    // the second component never started: bounded work, not all three
    expect(steps).toBeLessThan(3);
  });

  test("pre-aborted signal rejects immediately without invoking components", async () => {
    const controller = new AbortController();
    controller.abort();
    let invoked = false;
    const Never = async () => {
      invoked = true;
      return jsx("p", { children: "x" });
    };
    await expect(
      renderNodeAsync(jsx(Never, {}), { signal: controller.signal }),
    ).rejects.toBeInstanceOf(Error);
    expect(invoked).toBe(false);
  });
});
