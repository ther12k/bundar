/**
 * Version-neutral HTMX protocol model for @bundar/htmx (GH-039).
 *
 * This module defines header names, swap strategies, and negotiation helpers
 * that are common across HTMX versions. Versioned adapters import from this
 * module; @bundar/core and @bundar/jsx must not import from @bundar/htmx.
 */

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
