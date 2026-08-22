/**
 * GH-036 property tests: deterministic seeded invariants over hostile
 * inputs — escaping closure, attribute safety, idempotence, streaming
 * parity, and structural determinism.
 */
import { describe, expect, test } from "bun:test";
import {
  escapeAttributeValue,
  escapeText,
  fragment,
  jsx,
  renderToStream,
  renderToString,
  renderToStringAsync,
} from "../../src/index";

/** Deterministic PRNG (mulberry32) — failures reproduce exactly from the seed. */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ATOMS = [
  "<",
  ">",
  "&",
  '"',
  "'",
  "`",
  "/",
  "=",
  " ",
  ";",
  "(",
  ")",
  "\u0000",
  "\u2028",
  "é",
  "世",
  "🎉",
  "𝕏",
  "a",
  "9",
];

function hostileStrings(count: number, seed: number): string[] {
  const random = prng(seed);
  return Array.from({ length: count }, () => {
    const length = 1 + Math.floor(random() * 24);
    return Array.from(
      { length },
      () => ATOMS[Math.floor(random() * ATOMS.length)]!,
    ).join("");
  });
}

const HOSTILE = hostileStrings(400, 0x36_c0ffee);

describe("GH-036 property invariants", () => {
  test("text escaping is closed: no raw delimiter survives", () => {
    for (const value of HOSTILE) {
      const escaped = escapeText(value);
      expect(escaped).not.toContain("<");
      expect(escaped).not.toContain(">");
      // every remaining & must open one of the known text entities
      expect(escaped.replaceAll(/&(amp|lt|gt);/g, "")).not.toContain("&");
    }
  });

  test("attribute escaping is closed under double-quote contexts", () => {
    for (const value of HOSTILE) {
      const escaped = escapeAttributeValue(value);
      expect(escaped).not.toContain('"');
      // wrapping in quotes must yield a single attribute token
      expect(`x="${escaped}"`).toMatch(/^x="[^"]*"$/);
    }
  });

  test("rendered text children can never introduce markup", () => {
    for (const value of HOSTILE) {
      const html = renderToString(jsx("p", { children: value }));
      expect(html.startsWith("<p>")).toBe(true);
      expect(html.endsWith("</p>")).toBe(true);
      const inner = html.slice(3, -4);
      expect(inner).not.toMatch(/<(?!\/?p>)/);
      expect(inner.includes("<script")).toBe(false);
      expect(inner.includes("<img")).toBe(false);
    }
  });

  test("rendering is a pure function: identical trees, identical bytes", () => {
    const tree = (suffix: string) =>
      jsx("div", {
        class: "c",
        children: [
          jsx("span", { children: `a${suffix}` }),
          jsx("ul", {
            children: [1, 2, 3].map((n) =>
              jsx("li", { children: `i${n}-${suffix}` }),
            ),
          }),
        ],
      });
    expect(renderToString(tree("x"))).toBe(renderToString(tree("x")));
    // deterministic across "runs" (fresh nodes each time)
    expect(renderToString(tree("x"))).toBe(renderToString(tree("x")));
  });

  test("async and sync renderers agree byte for byte on static trees", async () => {
    for (const [index, value] of HOSTILE.slice(0, 50).entries()) {
      const tree = jsx("p", { "data-i": String(index), children: value });
      expect(await renderToStringAsync(tree)).toBe(renderToString(tree));
    }
  });

  test("streaming and string renderers agree byte for byte", async () => {
    for (const value of HOSTILE.slice(0, 50)) {
      const tree = jsx("p", { children: Promise.resolve(value) });
      const streamed = await new Response(renderToStream(tree).stream).text();
      expect(streamed).toBe(await renderToStringAsync(tree));
    }
  });

  test("fragment responses keep content-type without inventing markup", async () => {
    for (const value of HOSTILE.slice(0, 25)) {
      const response = await Promise.resolve(
        fragment(jsx("p", { children: value })),
      );
      expect(response.headers.get("content-type")).toBe(
        "text/html; charset=utf-8",
      );
      expect(await response.text()).toBe(`<p>${escapeText(value)}</p>`);
    }
  });
});
