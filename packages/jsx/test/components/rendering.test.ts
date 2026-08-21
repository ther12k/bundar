import { describe, expect, test } from "bun:test";
import { Fragment, jsx, jsxs } from "../../src/jsx-runtime";
import {
  AsyncComponentError,
  ComponentRenderError,
  CyclicChildError,
  renderNode,
} from "../../src/render/node";

function Div(props: { children?: unknown; id?: string }) {
  return jsx("div", { id: props.id, children: props.children });
}

describe("GH-029 functional components", () => {
  test("components are ordinary functions invoked with props", () => {
    const tree = jsx(Div, { id: "root", children: "hello" });
    expect(renderNode(tree)).toBe(`<div id="root">hello</div>`);
  });

  test("nested component composition renders inside-out", () => {
    const Inner = () => jsx("span", { children: "inner" });
    const Outer = (props: { children?: unknown }) =>
      jsxs("section", {
        children: [props.children, jsx("p", { children: "tail" })],
      });
    const tree = jsx(Outer, { children: jsx(Inner, {}) });
    expect(renderNode(tree)).toBe(
      `<section><span>inner</span><p>tail</p></section>`,
    );
  });

  test("component errors are attributed to the component by name", () => {
    function Broken(): never {
      throw new Error("boom");
    }
    expect(() => renderNode(jsx(Broken, {}))).toThrow(ComponentRenderError);
    try {
      renderNode(jsx(Broken, {}));
    } catch (error) {
      expect((error as ComponentRenderError).component).toBe("Broken");
      expect((error as Error).message).toContain("boom");
    }
  });

  test("promise-returning components fail with a GH-030 pointer", () => {
    const Async = async () => jsx("p", { children: "later" });
    expect(() => renderNode(jsx(Async, {}))).toThrow(AsyncComponentError);
  });
});

describe("GH-029 fragments, arrays, and iterables", () => {
  test("Fragment renders children only — no wrapper node", () => {
    const tree = jsxs(Fragment, {
      children: [jsx("p", { children: "a" }), jsx("p", { children: "b" })],
    });
    expect(renderNode(tree)).toBe(`<p>a</p><p>b</p>`);
  });

  test("nested arrays preserve source order at every depth", () => {
    const tree = jsxs("ul", {
      children: [
        [
          jsx("li", { children: 1 }),
          [jsx("li", { children: 2 }), [jsx("li", { children: 3 })]],
        ],
        jsx("li", { children: 4 }),
        [[[[jsx("li", { children: 5 })]]]],
      ],
    });
    expect(renderNode(tree)).toBe(
      `<ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li></ul>`,
    );
  });

  test("sets and generators render in iteration order", () => {
    const set = new Set([jsx("b", { children: "x" }), "y", 3]);
    expect(renderNode(jsx("div", { children: set }))).toBe(
      `<div><b>x</b>y3</div>`,
    );
    function* items() {
      yield jsx("i", { children: "a" });
      yield null;
      yield jsx("i", { children: "b" });
    }
    expect(renderNode(jsx("span", { children: items() }))).toBe(
      `<span><i>a</i><i>b</i></span>`,
    );
  });

  test("nullish and boolean children vanish without separators", () => {
    const tree = jsxs("div", {
      children: [null, "a", undefined, false, true, "b"],
    });
    expect(renderNode(tree)).toBe(`<div>ab</div>`);
  });
});

describe("GH-029 keys never leak into output", () => {
  test("keyed nodes render identically to unkeyed nodes", () => {
    const keyed = jsx("li", { children: "x" }, "k1");
    const unkeyed = jsx("li", { children: "x" });
    expect(renderNode(keyed)).toBe(renderNode(unkeyed));
    expect(renderNode(keyed)).not.toContain("key");
  });
});

describe("GH-029 cyclic and runaway structures fail safely", () => {
  test("an array containing itself is detected", () => {
    const cyclic: unknown[] = [jsx("p", { children: "start" })];
    cyclic.push(cyclic);
    expect(() => renderNode(cyclic)).toThrow(CyclicChildError);
  });

  test("a self-referencing iterable is detected", () => {
    const container: unknown[] = [];
    const set = new Set([container]);
    container.push(set);
    expect(() => renderNode(container)).toThrow(CyclicChildError);
  });

  test("runaway component recursion hits the depth limit with guidance", () => {
    const Loop = (): ReturnType<typeof jsx> => jsx(Loop, {});
    expect(() => renderNode(jsx(Loop, {}))).toThrow(/recursion exceeded/);
  });
});

describe("GH-029 deep nesting and large lists", () => {
  test("1000-deep element nesting renders correctly", () => {
    let tree: unknown = "core";
    for (let i = 0; i < 1000; i++) {
      tree = jsx("div", { children: tree });
    }
    const output = renderNode(tree);
    expect(output.startsWith("<div>".repeat(1000))).toBe(true);
    expect(output.endsWith("core" + "</div>".repeat(1000))).toBe(true);
  });

  test("a 10,000-item list renders in order", () => {
    const items = Array.from({ length: 10_000 }, (_, i) =>
      jsx("li", { children: i }),
    );
    const output = renderNode(jsxs("ul", { children: items }));
    expect(output).toMatch(/^<ul><li>0<\/li><li>1<\/li>/);
    expect(output).toMatch(/<li>9999<\/li><\/ul>$/);
    expect(output.match(/<li>/g)).toHaveLength(10_000);
  });
});
