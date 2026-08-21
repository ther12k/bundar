import { describe, expect, test } from "bun:test";
import {
  escapeAttributeValue,
  escapeText,
  renderPrimitive,
  UnsupportedChildError,
} from "../src/escape";

describe("GH-027 safe text rendering", () => {
  test("escapes the core HTML delimiter set in text context", () => {
    expect(escapeText("a & b")).toBe("a &amp; b");
    expect(escapeText("<script>")).toBe("&lt;script&gt;");
    expect(escapeText("1 < 2 > 0")).toBe("1 &lt; 2 &gt; 0");
  });

  test("quotes are additionally escaped for attribute values", () => {
    expect(escapeAttributeValue(`he said "hi"`)).toBe("he said &quot;hi&quot;");
    expect(escapeAttributeValue("it's")).toBe("it&#39;s");
    expect(escapeAttributeValue("<a href='x'>")).toBe(
      "&lt;a href=&#39;x&#39;&gt;",
    );
  });

  test("preserves Unicode content untouched", () => {
    expect(escapeText("héllo — 世界 🎉")).toBe("héllo — 世界 🎉");
    expect(escapeText("日本語<テキスト>")).toBe("日本語&lt;テキスト&gt;");
    expect(escapeText("a\u{1F600}b")).toBe("a\u{1F600}b");
  });
});

describe("GH-027 primitive rendering contract", () => {
  test("nullish and boolean children render as empty strings", () => {
    expect(renderPrimitive(null)).toBe("");
    expect(renderPrimitive(undefined)).toBe("");
    expect(renderPrimitive(true)).toBe("");
    expect(renderPrimitive(false)).toBe("");
  });

  test("strings are escaped, numbers and bigint use canonical forms", () => {
    expect(renderPrimitive("a<b")).toBe("a&lt;b");
    expect(renderPrimitive(42)).toBe("42");
    expect(renderPrimitive(0)).toBe("0");
    expect(renderPrimitive(-3.5)).toBe("-3.5");
    expect(renderPrimitive(9007199254740993n)).toBe("9007199254740993");
  });

  test("non-finite numbers are rejected", () => {
    expect(() => renderPrimitive(Number.NaN)).toThrow(UnsupportedChildError);
    expect(() => renderPrimitive(Number.POSITIVE_INFINITY)).toThrow(
      UnsupportedChildError,
    );
  });

  test("objects, symbols, and functions are rejected with diagnostics", () => {
    expect(() => renderPrimitive({})).toThrow(/\[object Object\]/);
    expect(() => renderPrimitive([1, 2])).toThrow(UnsupportedChildError);
    expect(() => renderPrimitive(() => 1)).toThrow(UnsupportedChildError);
    expect(() => renderPrimitive(Symbol("x"))).toThrow(UnsupportedChildError);
    try {
      renderPrimitive({ secret: 1 });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnsupportedChildError);
      // The diagnostic names the rejected type and points at alternatives;
      // it never leaks enumerable contents of the rejected value.
      expect((error as Error).message).toContain("unsupported JSX child");
      expect((error as Error).message).toContain("[object Object]");
      expect((error as Error).message).not.toContain("secret");
    }
  });
});

describe("GH-027 hostile input cannot break out of text context", () => {
  const hostile = [
    "</script><script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "--><!--",
    "']]></script>",
    "<svg/onload=alert(1)>",
    "\u003cscript\u003e",
  ];

  test.each(hostile)("hostile payload stays inert: %s", (payload) => {
    const rendered = renderPrimitive(payload);
    // After removing legitimate entities, no raw tag-forming delimiters remain:
    // the payload can never open or close an element.
    const stripped = rendered
      .replace(/&lt;/g, "")
      .replace(/&gt;/g, "")
      .replace(/&amp;/g, "")
      .replace(/&quot;/g, "")
      .replace(/&#39;/g, "");
    expect(stripped).not.toContain("<");
    expect(stripped).not.toContain(">");
    // Rendered output never introduces a bare executable attribute context.
    expect(rendered).not.toMatch(/<[^&]/);
  });
});
