import { describe, expect, test } from "bun:test";
import {
  renderAttributes,
  serializeAttribute,
  UnsafeAttributeNameError,
} from "../../src/render/attributes";

/**
 * GH-028 security: attribute values must never escape their double-quoted
 * context, regardless of quotes, angle brackets, entities, or Unicode.
 */
describe("GH-028 attribute value injection", () => {
  const hostileValues = [
    `" onmouseover="alert(1)`,
    `"><script>alert(1)</script>`,
    `"'><img src=x onerror=alert(1)>`,
    `&quot;&amp;&lt;`,
    `"; DROP TABLE users; --`,
    `\u0022onerror\u003dalert(1)`,
    `é"世"🎉`,
    `x" y="z`,
  ];

  test.each(hostileValues)("value stays inert: %s", (value) => {
    const rendered = renderAttributes({ "data-x": value });
    // The rendered form must contain exactly one data-x attribute occurrence
    // and no unescaped quote introduced by the value.
    const matches = rendered.match(/data-x=/g);
    expect(matches?.length).toBe(1);
    const stripped = rendered
      .replace(/&quot;/g, "")
      .replace(/&amp;/g, "")
      .replace(/&lt;/g, "")
      .replace(/&gt;/g, "")
      .replace(/&#39;/g, "");
    // after removing legitimate entities, no raw double quote beyond the delimiters
    expect((stripped.match(/"/g) ?? []).length).toBe(2);
    expect(stripped).not.toContain("<script");
  });

  test("entity-pretending payloads cannot smuggle markup", () => {
    const rendered = renderAttributes({
      title: `&lt;script&gt;alert(1)&lt;/script&gt;`,
    });
    // the value is escaped once more; raw < never enters the output
    expect(rendered).not.toMatch(/<script/i);
  });

  test("hostile names never reach serialization", () => {
    const hostileNames = [
      "onclick",
      "onerror",
      "onload",
      `"><script>`,
      "auto\0focus",
      " formaction",
      "formaction",
    ];
    // formaction itself is a valid name — but leading whitespace/control names
    // and on* are rejected; plain formaction is fine (value still escaped).
    for (const name of hostileNames.slice(0, 6)) {
      expect(() => serializeAttribute(name, "x")).toThrow();
    }
    expect(() => serializeAttribute("auto\0focus", "x")).toThrow(
      UnsafeAttributeNameError,
    );
  });

  test("round-trip: inert values survive unchanged", () => {
    for (const value of ["plain", "with space", "é", "a&b"]) {
      const rendered = renderAttributes({ "data-v": value });
      expect(rendered).toBe(` data-v="${value.replace(/&/g, "&amp;")}"`);
    }
  });
});
