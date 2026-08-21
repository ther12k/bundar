import { describe, expect, test } from "bun:test";
import {
  isBooleanAttribute,
  renderAttributes,
  serializeAttribute,
  serializeClass,
  serializeStyle,
  UnsafeAttributeNameError,
} from "../../src/render/attributes";

describe("GH-028 boolean attribute semantics", () => {
  test("true serializes to bare presence; false/null/undefined are omitted", () => {
    expect(serializeAttribute("disabled", true)).toEqual({
      name: "disabled",
      value: true,
    });
    expect(serializeAttribute("disabled", false)).toBeNull();
    expect(serializeAttribute("disabled", null)).toBeNull();
    expect(serializeAttribute("disabled", undefined)).toBeNull();
    expect(serializeAttribute("checked", "")).toBeNull();
    expect(isBooleanAttribute("READONLY")).toBe(true);
  });

  test("non-boolean true serializes to presence per contract", () => {
    expect(serializeAttribute("data-active", true)).toEqual({
      name: "data-active",
      value: true,
    });
  });
});

describe("GH-028 class model", () => {
  test("strings pass through trimmed; falsy entries drop", () => {
    expect(serializeClass("  btn primary ")).toBe("btn primary");
    expect(serializeClass(null)).toBe("");
    expect(serializeClass(false)).toBe("");
    expect(serializeClass(["a", null, "", undefined, "b"])).toBe("a b");
    expect(serializeClass([["x", ["y", ["z"]]]])).toBe("x y z");
  });

  test("record form emits deterministic sorted output", () => {
    expect(serializeClass({ zebra: true, alpha: true, skip: false })).toBe(
      "alpha zebra",
    );
    const again = serializeClass({ alpha: true, zebra: true });
    expect(again).toBe("alpha zebra");
  });
});

describe("GH-028 style model", () => {
  test("string style passes through; record form is sorted and hyphenated", () => {
    expect(serializeStyle("color:red")).toBe("color:red");
    expect(serializeStyle({ color: "red", zIndex: 10, marginTop: "4px" })).toBe(
      "color:red;margin-top:4px;z-index:10",
    );
    expect(serializeStyle({ skip: null, also: undefined })).toBe("");
    expect(serializeStyle({ width: 0 })).toBe("width:0");
  });

  test("style ordering is deterministic regardless of key order", () => {
    const a = serializeStyle({ b: 1, a: 2, C: 3 });
    const b = serializeStyle({ C: 3, a: 2, b: 1 });
    expect(a).toBe(b);
  });
});

describe("GH-028 attribute rendering", () => {
  test("renders sorted attributes with a leading space; children/key skipped", () => {
    expect(renderAttributes({ id: "x", class: "btn" })).toBe(
      ` class="btn" id="x"`,
    );
    expect(renderAttributes({ children: "ignored", key: 1 })).toBe("");
    expect(renderAttributes({})).toBe("");
  });

  test("numbers stringify; boolean HTML attributes stay bare", () => {
    expect(renderAttributes({ tabIndex: 0, hidden: true })).toBe(
      ` hidden tabindex="0"`,
    );
  });

  test("className aliases to class", () => {
    expect(renderAttributes({ className: "a b" })).toBe(` class="a b"`);
  });
});

describe("GH-028 attribute name safety", () => {
  test("on* event handlers are rejected", () => {
    expect(() => serializeAttribute("onclick", "alert(1)")).toThrow(
      UnsafeAttributeNameError,
    );
    expect(() => serializeAttribute("ONCLICK", "x")).toThrow(
      UnsafeAttributeNameError,
    );
  });

  test("malformed names are rejected", () => {
    // note: "javascript:x" is a legal namespaced NAME (like xlink:href);
    // URL dangers live in values, which are attribute-escaped.
    for (const bad of ["", "1abc", "-x", "a b", "a<b", '"x', "a=", "a/"]) {
      expect(() => serializeAttribute(bad, "v")).toThrow(
        UnsafeAttributeNameError,
      );
    }
  });

  test("data-, aria-, and namespaced names are accepted", () => {
    expect(serializeAttribute("data-id", "7")?.name).toBe("data-id");
    expect(serializeAttribute("aria-label", "Close")?.name).toBe("aria-label");
    expect(serializeAttribute("xlink:href", "#a")?.name).toBe("xlink:href");
    expect(serializeAttribute("htmlFor", "f")).not.toBeNull();
  });
});
