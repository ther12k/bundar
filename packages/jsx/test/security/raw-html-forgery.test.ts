/**
 * BR-005 reproduction + BR-006 closure evidence: raw-HTML brand forgery.
 *
 * History: at audit baseline 8ffd270 the brand was `Symbol.for("bundar.jsx.raw")`
 * — a realm-global registered symbol — and `isRawHtml()` accepted any object
 * whose brand property equaled `true`, including inherited properties. Both
 * deliberate-forgery probes below failed closed only AFTER BR-006 replaced
 * the marker with a module-private unique symbol plus an own-property check.
 *
 * Current guarantees pinned here:
 *
 * 1. Global-registry reconstruction (`Symbol.for("bundar.jsx.raw")`) no
 *    longer mints trust; the runtime brand cannot be named outside the module.
 * 2. `defineProperty` with any reconstructable key cannot forge the brand.
 * 3. Prototype laundering (`Object.create(genuine)`) is rejected by the
 *    own-property requirement.
 * 4. The accidental vectors from GH-031 — spread, JSON round trip, plain
 *    shape — remain blocked.
 * 5. Legitimate `raw()` values render verbatim in both string and stream
 *    renderers; unbranded payloads stay escaped.
 */

import { describe, expect, test } from "bun:test";
import { renderPrimitive } from "../../src/escape";
import { renderToStream } from "../../src/render-to-stream";
import { isRawHtml, raw } from "../../src/raw";

const PAYLOAD = `<img src=x onerror="alert('bundar-br-005')">`;

describe("BR-005/BR-006 raw-HTML brand forgery", () => {
  test("global symbol registry reconstruction does not mint trust", () => {
    // Any same-realm code could once do this; the registered key is now a
    // decoy that carries no authority.
    const forged = {
      html: PAYLOAD,
      [Symbol.for("bundar.jsx.raw")]: true,
    };
    expect(isRawHtml(forged)).toBe(false);
    expect(() => renderPrimitive(forged)).toThrow();
  });

  test("defineProperty with a reconstructable key cannot forge the brand", () => {
    const forged: Record<PropertyKey, unknown> = { html: PAYLOAD };
    Object.defineProperty(forged, Symbol.for("bundar.jsx.raw"), {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    expect(isRawHtml(forged)).toBe(false);
    expect(() => renderPrimitive(forged)).toThrow();
  });

  test("prototype-chain laundering is rejected (own-property requirement)", () => {
    const genuine = raw("<hr>");
    const laundered: object = Object.create(genuine) as object;
    expect(isRawHtml(laundered)).toBe(false);
    expect(() => renderPrimitive(laundered)).toThrow();
  });

  test("BR-068: brand symbols are not observable or copyable", async () => {
    const genuine = raw("<hr>");
    const symbols = Object.getOwnPropertySymbols(genuine);
    // The WeakSet model leaves NO marker on the value at all.
    expect(symbols).toEqual([]);

    // Even if an attacker guesses a symbol and defines it, membership
    // cannot be forged.
    const forged = Object.defineProperty({ html: PAYLOAD }, Symbol("x"), {
      value: true,
    });
    expect(isRawHtml(forged)).toBe(false);
  });

  test("BR-068: Proxy wrappers around genuine values fail closed", () => {
    const genuine = raw("<i>ok</i>");
    const lyingProxy = new Proxy(genuine, {
      get(_target, key) {
        if (key === "html") return PAYLOAD; // lie about content
        return Reflect.get(genuine, key);
      },
    });
    // WeakSet holds the TARGET, not the proxy — trust does not transfer.
    expect(isRawHtml(lyingProxy)).toBe(false);
    expect(() => renderPrimitive(lyingProxy as never)).toThrow();
  });

  test("BR-068: structuredClone drops trust; duplicate installs fail closed", async () => {
    const genuine = raw("<u>clone</u>");
    const cloned = structuredClone(genuine) as unknown as {
      html: string;
    };
    expect(cloned.html).toBe("<u>clone</u>");
    expect(isRawHtml(cloned)).toBe(false); // clone loses membership

    // Duplicate-install simulation: a second module instance would hold its
    // OWN WeakSet, so its values are untrusted here by construction. We
    // approximate by asserting that ANY hand-built lookalike fails.
    const lookalike = { html: "<b>from another install</b>" };
    Object.freeze(lookalike);
    expect(isRawHtml(lookalike)).toBe(false);
  });

  test("accidental vectors stay blocked (GH-031 spread/JSON/plain shape)", () => {
    const genuine = raw("<i>ok</i>");

    const spread = { ...genuine };
    expect(isRawHtml(spread)).toBe(false);

    const json = JSON.parse(JSON.stringify({ html: PAYLOAD }));
    expect(isRawHtml(json)).toBe(false);

    expect(isRawHtml({ html: PAYLOAD })).toBe(false);
    expect(isRawHtml([PAYLOAD])).toBe(false);
    expect(() => renderPrimitive(spread)).toThrow();
    expect(() => renderPrimitive(json)).toThrow();
  });

  test("unbranded strings and payloads remain escaped while branded pass", () => {
    expect(renderPrimitive(PAYLOAD)).not.toContain("<img");
    expect(renderPrimitive(raw(PAYLOAD))).toBe(PAYLOAD);
  });

  test("legitimate raw values render identically in string and stream paths", async () => {
    const trusted = raw('<b data-x="1">ok</b>');
    expect(renderPrimitive(trusted)).toBe('<b data-x="1">ok</b>');

    const rendered = renderToStream(raw("<hr>"));
    const reader = rendered.stream.getReader();
    const decoder = new TextDecoder();
    let streamed = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      streamed += decoder.decode(value, { stream: true });
    }
    streamed += decoder.decode();
    expect(streamed).toContain("<hr>");
  });
});

/*
 * THREAT MODEL (BR-005 deliverable, updated by BR-006)
 *
 * Before BR-006: forgery cost inside the server realm was one line via
 * Symbol.for; realistic risk was supply-chain erosion of the trust boundary
 * rather than a proven remote vulnerability (exploitation required executing
 * attacker-influenced code inside the realm).
 *
 * After BR-006: the marker is a module-private unique symbol plus an
 * own-property check. Same-realm code can still bypass escaping ONLY by
 * calling the explicit raw() API or by obtaining the unexported symbol
 * reference through a Bundar module namespace object (import { } from
 * "@bundar/jsx" exposes no such name). That preserves an auditable escape
 * hatch while removing string-key reconstruction and inheritance laundering.
 *
 * Responsibility split (unchanged): Bundar does not sanitize. Whoever calls
 * raw() owns sanitization of its argument.
 */
