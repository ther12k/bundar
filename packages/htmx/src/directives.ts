/**
 * Normalized HTMX response directives (GH-042).
 *
 * Applications express navigation/targeting/swapping/refresh/selection/event
 * intents as typed directive objects; `encodeDirectives` renders them into
 * `HX-*` headers deterministically, with conflict detection that fails before
 * a response is sent and CRLF/header-injection validation on every value.
 */
import type { HtmxResponseDirective } from "./dialect";

/** Navigation-family directives — at most one per response. */
const NAVIGATION_KINDS: ReadonlySet<string> = new Set([
  "redirect",
  "location",
  "push-url",
  "replace-url",
]);

export class DirectiveConflictError extends Error {
  public constructor(first: string, second: string) {
    super(
      `conflicting response directives "${first}" and "${second}": at most one ` +
        `navigation directive (redirect/location/push-url/replace-url) is allowed per response`,
    );
    this.name = "DirectiveConflictError";
  }
}

export class DirectiveValidationError extends Error {
  public constructor(kind: string, detail: string) {
    super(`invalid directive "${kind}": ${detail}`);
    this.name = "DirectiveValidationError";
  }
}

// eslint-disable-next-line no-control-regex -- intentional: detects injection
const HEADER_INJECTION = /[\u0000-\u001f\u007f\u0080-\u009f]/;
const SELECTOR_PATTERN = /^[A-Za-z0-9_[\]().#:= >~-]{1,256}$/;
const URL_PATTERN = /^[!#$&'()*+,./:;=?@[\]A-Za-z0-9_-]{1,2048}$/;

function validateNoInjection(kind: string, value: string): void {
  if (HEADER_INJECTION.test(value)) {
    throw new DirectiveValidationError(
      kind,
      "value contains control characters (header injection)",
    );
  }
}

function validateSelector(kind: string, selector: string): void {
  validateNoInjection(kind, selector);
  if (!SELECTOR_PATTERN.test(selector)) {
    throw new DirectiveValidationError(
      kind,
      "selector is not a valid CSS selector",
    );
  }
}

function validateUrl(kind: string, url: string): void {
  validateNoInjection(kind, url);
  if (url.length === 0 || url.length > 2048) {
    throw new DirectiveValidationError(kind, "url length out of bounds");
  }
  if (!URL_PATTERN.test(url)) {
    throw new DirectiveValidationError(kind, "url contains invalid characters");
  }
  // BR-064 corpus: inspect a ONCE-DECODED copy; emit the original untouched.
  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    throw new DirectiveValidationError(kind, "malformed percent-encoding");
  }
  validateNoInjection(kind, decoded);
  const haystack = decoded.replace(/\\/g, "/").toLowerCase();
  if (/^\s*(?:javascript|data|vbscript|file|blob):/.test(haystack)) {
    throw new DirectiveValidationError(kind, "dangerous URL scheme");
  }
  if (/[a-z][a-z0-9+.-]*:\/\/[^/@]*@/.test(haystack)) {
    throw new DirectiveValidationError(kind, "credential-bearing URL");
  }
  if (decoded.includes("../") || decoded.includes("..\\")) {
    throw new DirectiveValidationError(kind, "path traversal");
  }
}

function validateEventName(kind: string, name: string): void {
  validateNoInjection(kind, name);
  // Commas separate an EVENT LIST; each segment must be identifier-like.
  if (
    !/^[A-Za-z0-9_.:-]{1,128}(?:\s*,\s*[A-Za-z0-9_.:-]{1,128})*$/.test(name)
  ) {
    throw new DirectiveValidationError(
      kind,
      "event names must be identifier-like",
    );
  }
}

/**
 * Validates directives and returns them in deterministic order:
 * navigation first, then targeting/swap/refresh, then triggers.
 * Throws before any encoding when directives conflict.
 */
export function normalizeDirectives(
  directives: readonly HtmxResponseDirective[],
): readonly HtmxResponseDirective[] {
  const seen = new Set<string>();
  let navigationKind: string | null = null;

  for (const directive of directives) {
    if (NAVIGATION_KINDS.has(directive.kind)) {
      if (navigationKind && navigationKind !== directive.kind) {
        throw new DirectiveConflictError(navigationKind, directive.kind);
      }
      navigationKind = directive.kind;
    }
    if (seen.has(directive.kind)) {
      // same-kind duplicates are a conflict too (merge semantics are explicit
      // only through the trigger event list)
      if (directive.kind !== "trigger") {
        throw new DirectiveConflictError(directive.kind, directive.kind);
      }
    }
    seen.add(directive.kind);

    switch (directive.kind) {
      case "redirect":
      case "location":
        validateUrl(directive.kind, directive.url);
        break;
      case "push-url":
        if (directive.url !== false) validateUrl("push-url", directive.url);
        break;
      case "replace-url":
        validateUrl("replace-url", directive.url);
        break;
      case "retarget":
      case "reselect":
        validateSelector(directive.kind, directive.selector);
        break;
      case "reswap":
        validateNoInjection("reswap", directive.strategy);
        break;
      case "trigger":
        for (const event of directive.events) {
          validateEventName("trigger", event.name);
          if (event.detail !== undefined) {
            const serialized = JSON.stringify(event.detail);
            if (serialized.length > 4096) {
              throw new DirectiveValidationError(
                "trigger",
                `event payload for "${event.name}" exceeds 4096 bytes`,
              );
            }
            walkPrototypeKeys(event.detail, `event "${event.name}"`);
          }
        }
        break;
      case "refresh":
        break;
    }
  }

  const order: Record<string, number> = {
    redirect: 0,
    location: 0,
    "push-url": 0,
    "replace-url": 0,
    reswap: 1,
    retarget: 1,
    reselect: 1,
    refresh: 1,
    trigger: 2,
  };
  return [...directives].sort(
    (a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9),
  );
}

/**
 * Encodes directives into HX-* headers. Merge rule: trigger event lists
 * concatenate deterministically (deduplicated by name, first definition
 * wins); every other directive sets exactly one header.
 */
export function encodeDirectives(
  directives: readonly HtmxResponseDirective[],
): Headers {
  const normalized = normalizeDirectives(directives);
  const headers = new Headers();
  const events = new Map<string, unknown>();

  for (const directive of normalized) {
    switch (directive.kind) {
      case "redirect":
        headers.set("HX-Redirect", directive.url);
        break;
      case "location":
        headers.set("HX-Location", directive.url);
        break;
      case "push-url":
        headers.set(
          "HX-Push-URL",
          directive.url === false ? "false" : directive.url,
        );
        break;
      case "replace-url":
        headers.set("HX-Replace-URL", directive.url);
        break;
      case "reswap":
        headers.set("HX-Reswap", directive.strategy);
        break;
      case "retarget":
        headers.set("HX-Retarget", directive.selector);
        break;
      case "reselect":
        headers.set("HX-Reselect", directive.selector);
        break;
      case "refresh":
        headers.set("HX-Refresh", "true");
        break;
      case "trigger":
        for (const event of directive.events) {
          if (!events.has(event.name)) {
            events.set(event.name, event.detail ?? {});
          }
        }
        break;
    }
  }

  if (events.size > 0) {
    const payload: Record<string, unknown> = {};
    for (const [name, detail] of [...events].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      payload[name] = detail;
    }
    headers.set("HX-Trigger", JSON.stringify(payload));
  }

  return headers;
}

/** Applies encoded directives onto an existing response non-mutatively. */
export function applyDirectives(
  response: Response,
  directives: readonly HtmxResponseDirective[],
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of encodeDirectives(directives).entries()) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function walkPrototypeKeys(value: unknown, path: string): void {
  if (value === null || typeof value !== "object") return;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new DirectiveValidationError(
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
