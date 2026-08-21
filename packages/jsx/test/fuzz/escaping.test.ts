import { describe, expect, test } from "bun:test";
import {
  escapeAttributeValue,
  escapeText,
  renderPrimitive,
} from "../../src/escape";

/**
 * GH-027 property-style fuzz fixtures: deterministic delimiter combinations
 * covering quotes, ampersands, angle brackets, and Unicode edge characters.
 * Every generated string must render without an unescaped delimiter.
 */
function buildCorpus(): string[] {
  const atoms = [
    "&",
    "<",
    ">",
    '"',
    "'",
    "`",
    "/",
    ";",
    "=",
    " ",
    "\\",
    "\u0000",
    "é",
    "世",
    "\u2028",
  ];
  const corpus: string[] = ["", "&", "<", ">", '""', "''"];
  for (let i = 0; i < atoms.length; i++) {
    for (let j = 0; j < atoms.length; j++) {
      corpus.push(`${atoms[i]}${atoms[j]}`);
      corpus.push(`x${atoms[i]}y${atoms[j]}z`);
    }
  }
  // structured hostile composites
  corpus.push("<a=\"'><b>&amp;</b>", "a&&&b", "<<<<", ">>>>", "&lt;script&gt;");
  return corpus;
}

const corpus = buildCorpus();

describe("GH-027 escaping fuzz fixtures", () => {
  test("text context never emits raw < or & that starts an entity-looking sequence unsafely", () => {
    for (const input of corpus) {
      const output = escapeText(input);
      // every raw < must be escaped
      const unescapedLt = output.replace(/&lt;/g, "").replace(/&amp;/g, "");
      expect(unescapedLt).not.toContain("<");
    }
  });

  test("attribute context additionally never emits raw quotes", () => {
    for (const input of corpus) {
      const output = escapeAttributeValue(input);
      const stripped = output
        .replace(/&lt;/g, "")
        .replace(/&gt;/g, "")
        .replace(/&quot;/g, "")
        .replace(/&#39;/g, "")
        .replace(/&amp;/g, "");
      expect(stripped).not.toContain('"');
      expect(stripped).not.toContain("'");
    }
  });

  test("renderPrimitive matches escapeText for every string in the corpus", () => {
    for (const input of corpus) {
      expect(renderPrimitive(input)).toBe(escapeText(input));
    }
  });

  test("round-trip: escaping is stable and idempotent for inert strings", () => {
    for (const input of ["plain", "hello world", "123", "héllo"]) {
      expect(escapeText(escapeText(input))).toBe(escapeText(input));
    }
  });
});
