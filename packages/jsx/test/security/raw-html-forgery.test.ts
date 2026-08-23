/**
 * BR-005 reproduction + threat-model evidence: raw-HTML brand forgery.
 *
 * Documents the CURRENT behavior of the GH-031 trust boundary at the audit
 * baseline (8ffd270). The brand is `Symbol.for("bundar.jsx.raw")` — a REALM-
 * GLOBAL registered symbol — and `isRawHtml()` accepts any object whose
 * brand property equals `true`, regardless of how it was created.
 *
 * Findings encoded here (see file-end threat model):
 *
 * 1. DELIBERATE same-realm reconstruction forges the brand with one line of
 *    code (`Symbol.for("bundar.jsx.raw")`). This is a contract mismatch with
 *    GH-031's non-forgeability intent; remediation belongs to BR-006.
 * 2. Prototype-chain laundering via `Object.create(genuine)` also passes
 *    `isRawHtml()` because the check reads an inherited property.
 * 3. The ACCIDENTAL vectors GH-031 actually specified — spread, JSON round
 *    trip, plain shape — remain correctly blocked.
 *
 * These tests pin current behavior precisely so BR-006's opaque-brand fix
 * flips exactly the deliberate-forgery assertions.
 */

import { describe, expect, test } from "bun:test";
import { renderPrimitive } from "../../src/escape";
import { isRawHtml, raw } from "../../src/raw";

const PAYLOAD = `<img src=x onerror="alert('bundar-br-005')">`;

describe("BR-005 raw-HTML brand forgery (current behavior)", () => {
  test("the brand uses the global symbol registry (forgeable marker)", () => {
    // Any same-realm code — a dependency, a transitive import, application
    // code — can reconstruct the exact brand symbol without importing
    // anything from @bundar/jsx.
    const forged = {
      html: PAYLOAD,
      [Symbol.for("bundar.jsx.raw")]: true,
    };
    expect(isRawHtml(forged)).toBe(true);
    // Forged value renders verbatim: escaping is fully bypassed.
    expect(renderPrimitive(forged)).toBe(PAYLOAD);
  });

  test("defineProperty on an ordinary object also forges the brand", () => {
    const forged: Record<PropertyKey, unknown> = { html: PAYLOAD };
    Object.defineProperty(forged, Symbol.for("bundar.jsx.raw"), {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    expect(isRawHtml(forged)).toBe(true);
    expect(renderPrimitive(forged)).toBe(PAYLOAD);
  });

  test("prototype-chain laundering passes isRawHtml", () => {
    const genuine = raw("<hr>");
    const laundered: object = Object.create(genuine) as object;
    expect(isRawHtml(laundered)).toBe(true);
    expect((laundered as { html?: string }).html).toBe("<hr>");
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
});

/*
 * THREAT MODEL (BR-005 deliverable)
 *
 * Brand mechanism: `Symbol.for("bundar.jsx.raw")` + truthy property check.
 * Forgery cost inside the server realm: one line, no Bundar imports.
 *
 * Contract mismatch, not proven remote vulnerability:
 * - Exploitation requires executing attacker-influenced code INSIDE the
 *   server realm (compromised dependency, eval'd config, SSRF-reachable code
 *   generator). An attacker with that capability usually has stronger
 *   primitives than a JSX bypass; no network-reachable path feeds untrusted
 *   objects into JSX children today.
 * - The realistic risk is defense-in-depth erosion: supply-chain incidents,
 *   copy-pasted "helper" modules, or future Bundar-adjacent tooling treating
 *   the brand as public API. A trust boundary whose forgeability depends on
 *   nobody ever calling Symbol.for with a guessable key does not hold its
 *   documented guarantee ("cannot forge the brand").
 *
 * Remediation requirements handed to BR-006:
 * - Module-private (non-registered) symbol or closure-hidden state, so the
 *   brand cannot be reconstructed outside packages/jsx.
 * - Own-property (non-inherited) brand check to kill prototype laundering.
 * - Keep spread/JSON/plain-shape vectors blocked (regression suite stays).
 * - No sanitizer bundled; raw() caller responsibility unchanged.
 */
