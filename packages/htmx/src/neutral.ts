/**
 * Version-neutral HTMX protocol model for @bundar/htmx (GH-039).
 *
 * This module defines header names, swap strategies, and negotiation helpers
 * that are common across HTMX versions. Versioned adapters import from this
 * module; @bundar/core and @bundar/jsx must not import from @bundar/htmx.
 */
import type { HtmxDialectAdapter } from "./dialect";

export type HtmxRequestHeader =
  | "HX-Request"
  | "HX-Boosted"
  | "HX-Current-URL"
  | "HX-History-Restore-Request"
  | "HX-Prompt"
  | "HX-Target"
  | "HX-Trigger"
  | "HX-Trigger-Name";

export type HtmxResponseHeader =
  | "HX-Location"
  | "HX-Push-URL"
  | "HX-Redirect"
  | "HX-Refresh"
  | "HX-Replace-URL"
  | "HX-Reselect"
  | "HX-Reswap"
  | "HX-Retarget"
  | "HX-Trigger"
  | "HX-Trigger-After-Settle"
  | "HX-Trigger-After-Swap";

export type HtmxSwapStrategy =
  | "innerHTML"
  | "outerHTML"
  | "textContent"
  | "beforebegin"
  | "afterbegin"
  | "beforeend"
  | "afterend"
  | "delete"
  | "none";

export type HtmxDialectVersion = "htmx2" | "htmx4";

export type HtmxDialect = Readonly<{
  readonly version: HtmxDialectVersion;
  readonly experimental: boolean;
  readonly pinnedVersion: string;
}>;

export const HTMX_REQUEST_HEADERS: readonly HtmxRequestHeader[] = [
  "HX-Request",
  "HX-Boosted",
  "HX-Current-URL",
  "HX-History-Restore-Request",
  "HX-Prompt",
  "HX-Target",
  "HX-Trigger",
  "HX-Trigger-Name",
];

export const HTMX_RESPONSE_HEADERS: readonly HtmxResponseHeader[] = [
  "HX-Location",
  "HX-Push-URL",
  "HX-Redirect",
  "HX-Refresh",
  "HX-Replace-URL",
  "HX-Reselect",
  "HX-Reswap",
  "HX-Retarget",
  "HX-Trigger",
  "HX-Trigger-After-Settle",
  "HX-Trigger-After-Swap",
];

export function isHtmxRequest(request: Request): boolean {
  return request.headers.get("HX-Request") === "true";
}

export function isBoostedRequest(request: Request): boolean {
  return request.headers.get("HX-Boosted") === "true";
}

export function getHtmxTarget(request: Request): string | null {
  return request.headers.get("HX-Target");
}

export function getHtmxTrigger(request: Request): string | null {
  return request.headers.get("HX-Trigger");
}

export function withHtmxHeaders(
  response: Response,
  headers: Partial<Record<HtmxResponseHeader, string>>,
): Response {
  const next = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      next.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: next,
  });
}

/**
 * Options for building a dialect-correct set of HTMX request headers
 * (GH-074): exactly what a real browser running the dialect would send.
 * Test clients use this so tests never hand-write protocol strings.
 */
export interface HtmxRequestHeaderOptions {
  /** Target element selector (untrusted metadata, as from a browser). */
  readonly target?: string;
  /** id/name of the triggering element. */
  readonly trigger?: string;
  /** Name attribute of a form-bound trigger. */
  readonly triggerName?: string;
  /** Request came from an hx-boosted region. */
  readonly boosted?: boolean;
  /** The page URL the browser believes it is on. */
  readonly currentUrl?: string;
  /** hx-prompt answer accompanying the request. */
  readonly prompt?: string;
  /** History restore replay (back/forward navigation). */
  readonly historyRestore?: boolean;
}

function aliasFor(
  dialect: HtmxDialectAdapter | undefined,
  canonical: HtmxRequestHeader,
): string {
  const aliases = dialect?.metadata as Record<string, unknown> | undefined;
  const map = aliases?.["requestHeaderAliases"] as
    Partial<Record<HtmxRequestHeader, string>> | undefined;
  return map?.[canonical] ?? canonical;
}

/**
 * Builds the request-header map an enhanced (HTMX) request carries, with
 * dialect aliasing applied from the adapter's metadata (htmx 4 beta sends
 * the trigger under `HX-Source`; htmx 2 uses the canonical name). The
 * adapter is data, not a conditional: unversioned callers get canonical
 * names.
 */
export function buildHtmxRequestHeaders(
  options: HtmxRequestHeaderOptions = {},
  dialect?: HtmxDialectAdapter,
): Record<string, string> {
  const headers: Record<string, string> = {
    [aliasFor(dialect, "HX-Request")]: "true",
  };
  if (options.boosted === true) {
    headers[aliasFor(dialect, "HX-Boosted")] = "true";
  }
  if (options.currentUrl !== undefined) {
    headers[aliasFor(dialect, "HX-Current-URL")] = options.currentUrl;
  }
  if (options.historyRestore === true) {
    headers[aliasFor(dialect, "HX-History-Restore-Request")] = "true";
  }
  if (options.prompt !== undefined) {
    headers[aliasFor(dialect, "HX-Prompt")] = options.prompt;
  }
  if (options.target !== undefined) {
    headers[aliasFor(dialect, "HX-Target")] = options.target;
  }
  if (options.trigger !== undefined) {
    headers[aliasFor(dialect, "HX-Trigger")] = options.trigger;
  }
  if (options.triggerName !== undefined) {
    headers[aliasFor(dialect, "HX-Trigger-Name")] = options.triggerName;
  }
  return headers;
}
