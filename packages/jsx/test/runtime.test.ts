import { describe, expect, test } from "bun:test";
import { Fragment, jsx, jsxDEV, jsxs } from "../src/index";

describe("GH-026 JSX runtime surface", () => {
  test("creates frozen server JSX nodes without a browser runtime", () => {
    const child = jsx("span", { children: "hello" });
    const node = jsxs("div", { children: [child, "world"] }, "key");

    expect(node.type).toBe("div");
    expect(node.props.children).toEqual([child, "world"]);
    expect(node.key).toBe("key");
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.props)).toBe(true);
    expect(Fragment.description).toBe("bundar.jsx.fragment");
    expect(jsxDEV("p", { children: "dev" }).type).toBe("p");
  });
});
