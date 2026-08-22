/**
 * GH-035 runtime tests: hx-* attributes render as ordinary attributes with
 * their names untouched, values escaped, and boolean semantics consistent
 * with the rest of the renderer. Types are proven by the sibling
 * htmx-attributes.test-d.ts through the package typecheck.
 */
import { describe, expect, test } from "bun:test";
import { jsx, renderToString } from "../../src/index";

describe("GH-035 hx-* attribute rendering", () => {
  test("attribute names pass through unchanged", () => {
    const html = renderToString(
      jsx("button", {
        id: "load",
        "hx-get": "/items",
        "hx-target": "#list",
        "hx-swap": "outerHTML swap:50ms",
        "hx-trigger": "click delay:100ms",
      }),
    );
    // attributes render in the renderer's sorted order, names untouched
    expect(html).toBe(
      '<button hx-get="/items" hx-swap="outerHTML swap:50ms" hx-target="#list" hx-trigger="click delay:100ms" id="load"></button>',
    );
  });

  test("values are escaped like every attribute", () => {
    const html = renderToString(
      jsx("div", { "hx-confirm": 'Are you "sure"?' }),
    );
    expect(html).toContain('hx-confirm="Are you &quot;sure&quot;?"');
  });

  test("boolean hx attributes follow boolean semantics", () => {
    expect(renderToString(jsx("div", { "hx-boost": true }))).toBe(
      "<div hx-boost></div>",
    );
    expect(renderToString(jsx("div", { "hx-boost": false }))).toBe(
      "<div></div>",
    );
  });

  test("empty-string hx flags follow the empty-string attribute contract", () => {
    expect(renderToString(jsx("div", { "hx-history-elt": "" }))).toBe(
      '<div hx-history-elt=""></div>',
    );
  });

  test("server-only event handlers still fail closed", () => {
    expect(() =>
      renderToString(jsx("button", { onClick: "alert(1)" } as never)),
    ).toThrow();
  });
});
