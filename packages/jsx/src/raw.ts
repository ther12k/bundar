/**
 * Explicit raw-HTML trust boundary (GH-031, BR-006, BR-068 hardening).
 *
 * Only values constructed through `raw()` bypass text escaping.
 *
 * Trust mechanism: a MODULE-PRIVATE WeakSet membership check — strictly
 * stronger than any property-based brand because:
 * - there is NO observable marker to copy: getOwnPropertySymbols reveals
 *   nothing and defineProperty cannot forge membership;
 * - Proxy wrappers around genuine values FAIL (the WeakSet holds the
 *   original target, never the proxy);
 * - prototype chains cannot launder trust (own-object identity);
 * - a second installed copy of @bundar/jsx has its OWN WeakSet, so its
 *   values are untrusted here (duplicate installs fail closed).
 *
 * Trust statement: Bundar ships no sanitizer. `raw(...)` marks HTML the
 * caller has already sanitized; whoever writes `raw(...)` owns sanitization
 * of its argument. See docs/security/raw-html.md for the exact guarantee.
 */

/** Module-private trust registry. Never exported, never enumerable. */
const trustedRawValues = new WeakSet<object>();

/** Opaque trusted-HTML value; trust is keyed on object IDENTITY. */
export interface RawHtml {
  readonly html: string;
}

/** Returns true only for values created by `raw()` in THIS module instance. */
export function isRawHtml(value: unknown): value is RawHtml {
  return (
    typeof value === "object" && value !== null && trustedRawValues.has(value)
  );
}

/**
 * Deliberately marks a string as trusted HTML. The caller owns sanitization;
 * prefer escaped children or components whenever possible.
 */
export function raw(html: string): RawHtml {
  const value: { html: string } = { html };
  Object.freeze(value);
  trustedRawValues.add(value);
  return value as RawHtml;
}
