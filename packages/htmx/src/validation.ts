/**
 * Protocol-local value validation for HTMX response directives (BR-064).
 *
 * Zero-dependency and ADR-0018-pure: this module never imports
 * @bundar/core. Every directive class gets an explicit validator, and the
 * attack corpus is pinned by test/security/directive-validation.test.ts:
 * CR/LF injection, NUL/control bytes, javascript:/data: destinations,
 * scheme-relative URLs, credential-bearing URLs, backslash normalization,
 * encoded traversal, oversized payloads, prototype-like JSON keys.
 *
 * Inspection decodes ONCE (percent-encoding) but the ORIGINAL value is
 * what lands on the wire — Bundar never silently rewrites application
 * intent, it rejects it.
 */

export class HtmxValidationError extends Error {
  public constructor(
    public readonly directive: string,
    message: string,
  ) {
    super(`${directive}: ${message}`);
    this.name = "HtmxValidationError";
  }
}

/** NUL, CRLF, other C0/C1 control characters. */
// eslint-disable-next-line no-control-regex -- intentional: detects injection
const CONTROL_CHARS = /[\u0000-\u001f\u007f\u0080-\u009f]/;

const MAX_URL_LENGTH = 2048;
const MAX_SELECTOR_LENGTH = 512;
const MAX_EVENT_NAME_LENGTH = 128;
const MAX_TRIGGER_PAYLOAD_BYTES = 4096;

function assertNoControls(directive: string, value: string): void {
  if (CONTROL_CHARS.test(value)) {
    throw new HtmxValidationError(
      directive,
      "contains control characters or line breaks",
    );
  }
}

function decodeOnce(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null; // malformed percent-encoding
  }
}

const DANGEROUS_SCHEME = /^\s*(?:javascript|data|vbscript|file|blob):/i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const CREDENTIALS = /[a-z][a-z0-9+.-]*:\/\/[^/@]*@/i;

/**
 * Validates a URL destined for HX-Redirect / HX-Location / HX-Push-URL /
 * HX-Replace-URL. Relative same-origin paths are always allowed; absolute
 * URLs and protocol-relative destinations require `allowExternal`.
 */
export function validateUrlValue(
  directive: string,
  url: string,
  options: { allowExternal?: boolean } = {},
): string {
  if (typeof url !== "string" || url.length === 0) {
    throw new HtmxValidationError(directive, "URL must be a non-empty string");
  }
  if (url.length > MAX_URL_LENGTH) {
    throw new HtmxValidationError(
      directive,
      `URL exceeds ${MAX_URL_LENGTH} characters`,
    );
  }
  assertNoControls(directive, url);

  const decoded = decodeOnce(url);
  if (decoded === null) {
    throw new HtmxValidationError(directive, "malformed percent-encoding");
  }
  assertNoControls(directive, decoded);

  const haystack = decoded.replace(/\\\//g, "/").toLowerCase();
  if (DANGEROUS_SCHEME.test(haystack)) {
    throw new HtmxValidationError(directive, "dangerous URL scheme");
  }
  if (/^[/\\]{2}/.test(decoded.trim())) {
    // Protocol-relative destination: origin depends on caller trust.
    if (options.allowExternal !== true)
      throw new HtmxValidationError(
        directive,
        "protocol-relative URL requires allowExternal",
      );
  } else if (!decoded.startsWith("/")) {
    // Not starting with "/" means either absolute scheme URL or garbage.
    if (ANY_SCHEME.test(haystack)) {
      if (CREDENTIALS.test(haystack))
        throw new HtmxValidationError(directive, "credential-bearing URL");
      if (options.allowExternal !== true)
        throw new HtmxValidationError(
          directive,
          "absolute URL requires allowExternal",
        );
    } else {
      throw new HtmxValidationError(
        directive,
        "relative URL must begin with '/'",
      );
    }
  }

  // Encoded path traversal survives decoding as ../ or ..\
  if (/(\.\.[\\/])|([\\]\.\.)/.test(decoded)) {
    throw new HtmxValidationError(directive, "path traversal");
  }
  return url;
}

const SELECTOR_ALLOWED = /^[\w. #()="':>~,*$|^|-]+$/;

/** Validates retarget/reselect CSS selector directives. */
export function validateSelectorValue(
  directive: string,
  selector: string,
): string {
  if (typeof selector !== "string" || selector.length === 0) {
    throw new HtmxValidationError(directive, "selector must be non-empty");
  }
  if (selector.length > MAX_SELECTOR_LENGTH) {
    throw new HtmxValidationError(
      directive,
      `selector exceeds ${MAX_SELECTOR_LENGTH} characters`,
    );
  }
  assertNoControls(directive, selector);
  if (!SELECTOR_ALLOWED.test(selector)) {
    throw new HtmxValidationError(
      directive,
      "selector contains disallowed characters",
    );
  }
  return selector;
}

const RESWAP_BASE =
  /^(?:innerHTML|outerHTML|beforebegin|afterbegin|beforeend|afterend|delete|none)(?:\s+[a-z]+(?::[\w.-]+)*)*$/i;

/** Validates HX-Reswap strategy strings including modifier suffixes. */
export function validateSwapValue(strategy: string): string {
  if (
    typeof strategy !== "string" ||
    strategy.length === 0 ||
    strategy.length > 128
  ) {
    throw new HtmxValidationError("reswap", "invalid swap strategy length");
  }
  assertNoControls("reswap", strategy);
  if (!RESWAP_BASE.test(strategy)) {
    throw new HtmxValidationError("reswap", "unrecognized swap strategy");
  }
  return strategy;
}

const EVENT_NAME_SEGMENT = /^[A-Za-z0-9_.:-]{1,128}$/;

/**
 * Validates trigger event names. htmx treats commas as event-list
 * separators, so EACH segment is validated individually.
 */
export function validateEventName(name: string): string {
  if (typeof name !== "string") {
    throw new HtmxValidationError("trigger", "event name must be a string");
  }
  assertNoControls("trigger", name);
  for (const segment of name.split(",")) {
    const trimmed = segment.trim();
    if (
      trimmed.length === 0 ||
      trimmed.length > MAX_EVENT_NAME_LENGTH ||
      !EVENT_NAME_SEGMENT.test(trimmed)
    ) {
      throw new HtmxValidationError(
        "trigger",
        `invalid event name segment "${trimmed.slice(0, 32)}"`,
      );
    }
  }
  return name;
}

/** Validates serialized trigger payload details (size + prototype keys). */
export function validateTriggerDetail(
  eventName: string,
  detail: unknown,
): unknown {
  if (detail === undefined || detail === null) return detail;
  let serialized: string;
  try {
    serialized = JSON.stringify(detail);
  } catch {
    throw new HtmxValidationError("trigger", "event detail is not JSON-safe");
  }
  if (serialized.length > MAX_TRIGGER_PAYLOAD_BYTES) {
    throw new HtmxValidationError(
      "trigger",
      `event payload for "${eventName}" exceeds ${MAX_TRIGGER_PAYLOAD_BYTES} bytes`,
    );
  }
  walkPrototypeKeys(detail, `event "${eventName}"`);
  return detail;
}

function walkPrototypeKeys(value: unknown, path: string): void {
  if (value === null || typeof value !== "object") return;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new HtmxValidationError(
        "trigger",
        `prototype-like key "${key}" at ${path}.${key}`,
      );
    }
    walkPrototypeKeys(
      (value as Record<string, unknown>)[key],
      `${path}.${key}`,
    );
  }
}
