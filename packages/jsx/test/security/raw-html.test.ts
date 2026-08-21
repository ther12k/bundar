import { describe, expect, test } from "bun:test";
import { jsx } from "../../src/jsx-runtime";
import { renderPrimitive } from "../../src/escape";
import { renderNode } from "../../src/render/node";
import { isRawHtml, raw } from "../../src/raw";

describe("GH-031 branded raw values", () => {
  test("raw() creates a frozen branded value; isRawHtml identifies it", () => {
    const value = raw("<b>bold</b>");
    expect(isRawHtml(value)).toBe(true);
    expect(Object.isFrozen(value)).toBe(true);
    expect(value.html).toBe("<b>bold</b>");
    expect(isRawHtml("<b>bold</b>")).toBe(false);
    expect(isRawHtml({ html: "<b>x</b>" })).toBe(false);
    expect(isRawHtml(null)).toBe(false);
  });

  test("only branded values bypass escaping — ordinary strings always escape", () => {
    expect(renderPrimitive("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(renderPrimitive(raw("<script>alert(1)</script>"))).toBe(
      "<script>alert(1)</script>",
    );
  });

  test("the brand cannot be forged by object shape, spread, or JSON", () => {
    const genuine = raw("<i>ok</i>");
    // spread copies enumerable props only — the brand symbol is not enumerable
    const spread = { ...genuine };
    expect(isRawHtml(spread)).toBe(false);
    expect(() => renderPrimitive(spread)).toThrow();

    const json = JSON.parse(JSON.stringify({ html: "<i>x</i>" }));
    expect(isRawHtml(json)).toBe(false);

    const impostor = { html: "<b>x</b>" } as object;
    expect(isRawHtml(impostor)).toBe(false);
    expect(() => renderPrimitive(impostor)).toThrow();
  });

  test("raw values render verbatim inside components and children", () => {
    const tree = jsx("div", {
      children: [raw("<hr>"), "a<b", raw("<b>b</b>")],
    });
    expect(renderNode(tree)).toBe(`<div><hr>a&lt;b<b>b</b></div>`);
  });
});

describe("GH-031 raw payload security surface", () => {
  // The trust boundary is explicit: these payloads pass through UNESCAPED
  // when wrapped in raw() — that is the documented contract. The security
  // property under test is the inverse: UNBRANDED versions never pass.
  const payloads = {
    script: `<script>alert("xss")</script>`,
    svg: `<svg onload="alert(1)"><circle r="1"/></svg>`,
    attribute: `<img src="x" onerror="alert(1)">`,
    comment: `<!-- injected --><p>after</p>`,
    closing: `</div></body></html><script>steal()</script>`,
  };

  test("every unbranded payload is fully escaped in text context", () => {
    for (const payload of Object.values(payloads)) {
      const output = renderPrimitive(payload);
      expect(output).not.toContain("<script");
      expect(output).not.toContain("<svg");
      expect(output).not.toContain("<img");
      expect(output).not.toMatch(/<\/?[a-z]/i);
    }
  });

  test("branded payloads are the ONLY ones that bypass", () => {
    for (const payload of Object.values(payloads)) {
      expect(renderPrimitive(raw(payload))).toBe(payload);
    }
  });

  test("attribute context never accepts raw values", () => {
    // raw() is a child-position boundary; attribute values remain escaped
    // even when handed a branded object (attributes serialize via String()).
    const tree = jsx("a", { href: raw("javascript:alert(1)") });
    const output = renderNode(tree);
    expect(output).not.toContain('href="javascript:alert(1)"');
  });
});
