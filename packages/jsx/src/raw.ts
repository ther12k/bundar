/**
 * Explicit raw-HTML trust boundary (GH-031, BR-006).
 *
 * Only values constructed through `raw()` bypass text escaping. The brand is
 * a module-private unique symbol: it is NOT registered in the global symbol
 * registry (`Symbol.for`), is not exported, and cannot be reconstructed from
 * a string key by other modules or dependencies. `isRawHtml()` additionally
 * requires the brand as an OWN property, so prototype chains rooted at a
 * genuine value cannot launder trust either. Plain objects, spread copies,
 * and JSON round-trips remain rejected.
 *
 * Trust statement: Bundar ships no sanitizer. `raw(...)` marks HTML the
 * caller has already sanitized; whoever writes `raw(...)` owns sanitization
 * of its argument. No sanitizer or trusted-types polyfill is bundled in v0.1
 * by scope decision. See docs/security/raw-html.md for the exact guarantee.
 */

const RAW_BRAND = Symbol("bundar.jsx.raw");

export interface RawHtml {
  readonly html: string;
  readonly [RAW_BRAND]: true;
}

/** Returns true only for values created by `raw()`. */
export function isRawHtml(value: unknown): value is RawHtml {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, RAW_BRAND) &&
    (value as { [RAW_BRAND]?: unknown })[RAW_BRAND] === true
  );
}

/**
 * Deliberately marks a string as trusted HTML. The caller owns sanitization;
 * prefer escaped children or components whenever possible.
 */
export function raw(html: string): RawHtml {
  const branded = { html } as { html: string } & { [RAW_BRAND]: true };
  Object.defineProperty(branded, RAW_BRAND, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(branded) as RawHtml;
}
