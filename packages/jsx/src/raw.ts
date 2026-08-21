/**
 * Explicit raw-HTML trust boundary (GH-031).
 *
 * Only values constructed through `raw()` bypass text escaping. The brand is
 * a private symbol; the marker field is non-enumerable, non-writable, and
 * truthy-unique, so ordinary objects — even ones shaped like the internal
 * representation — cannot forge the brand by property copying, spreading, or
 * JSON round-tripping. Bundar ships no sanitizer: the caller who writes
 * `raw(...)` owns sanitization. No sanitizer or trusted-types polyfill is
 * bundled in v0.1 by scope decision.
 */

const RAW_BRAND = Symbol.for("bundar.jsx.raw");

export interface RawHtml {
  readonly html: string;
  readonly [RAW_BRAND]: true;
}

/** Returns true only for values created by `raw()`. */
export function isRawHtml(value: unknown): value is RawHtml {
  return (
    typeof value === "object" &&
    value !== null &&
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
