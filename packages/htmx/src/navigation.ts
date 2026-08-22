/**
 * Redirect, location, and history navigation helpers (GH-052).
 *
 * Provides safe, open-redirect-protected navigation responses that behave
 * consistently across normal and HTMX-enhanced requests.
 *
 * Security properties:
 * - External redirects are DENIED BY DEFAULT unless explicitly allow-listed.
 * - Protocol-relative URLs (e.g. `//evil.com`) and javascript: schemes fail closed.
 * - Relative URLs resolve against the request origin.
 * - Control characters / CRLF injection fail closed.
 * - Normal requests receive standards-compliant 303 Location redirects;
 *   enhanced requests receive HX-Redirect / HX-Location headers with 200 OK.
 */
import { normalizeHtmxRequest } from "./request";
import { applyDirectives } from "./directives";
import type { HtmxResponseDirective } from "./dialect";

export class InvalidRedirectUrlError extends Error {
  public constructor(url: string, detail: string) {
    super(`invalid redirect URL ${JSON.stringify(url)}: ${detail}`);
    this.name = "InvalidRedirectUrlError";
  }
}

export interface RedirectUrlOptions {
  /** Explicit list of permitted external origins (e.g. ["https://auth.example.com"]). */
  readonly allowedOrigins?: readonly string[];
  /** Expected base origin of the application (e.g. "http://localhost:3000"). */
  readonly baseOrigin?: string;
}

const CONTROL_CHARS = /[\r\n\0]/;

/**
 * Validates a redirect URL against open-redirect policies.
 *
 * Disallowed:
 * - Protocol-relative URLs (`//evil.com`)
 * - JavaScript schemes (`javascript:...`)
 * - Data schemes (`data:...`)
 * - Unlisted external domains
 * - Control characters (CRLF)
 */
export function validateRedirectUrl(
  url: string,
  options: RedirectUrlOptions = {},
): string {
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new InvalidRedirectUrlError(url, "URL must be a non-empty string");
  }
  const trimmed = url.trim();
  if (CONTROL_CHARS.test(trimmed)) {
    throw new InvalidRedirectUrlError(trimmed, "control characters rejected");
  }
  // Protocol-relative check: starting with // is an open-redirect vector
  if (trimmed.startsWith("//")) {
    throw new InvalidRedirectUrlError(
      trimmed,
      "protocol-relative URLs are denied by default",
    );
  }
  // Scheme checks
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    throw new InvalidRedirectUrlError(
      trimmed,
      "executable URI schemes are forbidden",
    );
  }

  // If it's a relative URL starting with a slash, it's valid for local redirect
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  // Parse absolute URL to check origin
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidRedirectUrlError(trimmed, "malformed URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidRedirectUrlError(
      trimmed,
      `unsupported protocol: ${parsed.protocol}`,
    );
  }

  const baseOrigin = options.baseOrigin
    ? new URL(options.baseOrigin).origin
    : undefined;
  if (baseOrigin !== undefined && parsed.origin === baseOrigin) {
    return trimmed;
  }

  const allowedOrigins = options.allowedOrigins ?? [];
  if (allowedOrigins.includes(parsed.origin)) {
    return trimmed;
  }

  throw new InvalidRedirectUrlError(
    trimmed,
    `external origin ${parsed.origin} is not in allowedOrigins`,
  );
}

export interface HtmxLocationConfig {
  readonly path: string;
  readonly target?: string;
  readonly swap?: string;
  readonly values?: Record<string, unknown>;
  readonly headers?: Record<string, string>;
  readonly select?: string;
}

export interface ComposeNavigationOptions extends RedirectUrlOptions {
  /** Redirect status for ordinary requests. Defaults to 303. */
  readonly fallbackStatus?: 301 | 302 | 303 | 307 | 308;
  /** Whether to use HX-Location instead of full-page HX-Redirect for enhanced requests. */
  readonly locationConfig?: Omit<HtmxLocationConfig, "path">;
}

/**
 * Creates a navigation response that automatically adapts:
 * - Ordinary requests get an HTTP 303 Location redirect (or configured fallbackStatus).
 * - Enhanced (HTMX) requests get an HX-Redirect or HX-Location header with 200 OK.
 */
export function composeNavigation(
  request: Request,
  url: string,
  options: ComposeNavigationOptions = {},
): Response {
  const baseOrigin = options.baseOrigin ?? new URL(request.url).origin;
  const validated = validateRedirectUrl(url, { ...options, baseOrigin });
  const metadata = normalizeHtmxRequest(request);

  if (metadata.isHtmx) {
    const directives: HtmxResponseDirective[] = [];
    if (options.locationConfig !== undefined) {
      directives.push({
        kind: "location",
        url: validated,
      });
    } else {
      directives.push({
        kind: "redirect",
        url: validated,
      });
    }
    return applyDirectives(
      new Response(null, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
      directives,
    );
  }

  const status = options.fallbackStatus ?? 303;
  return new Response(null, {
    status,
    headers: {
      location: validated,
    },
  });
}

/**
 * Creates an HX-Redirect response for enhanced requests, or a 303 Location redirect for non-HTMX.
 */
export function htmxRedirect(
  request: Request,
  url: string,
  options: ComposeNavigationOptions = {},
): Response {
  return composeNavigation(request, url, options);
}

/**
 * Creates an HX-Location response for enhanced client-side swaps, or fallback 303 redirect.
 */
export function htmxLocation(
  request: Request,
  config: string | HtmxLocationConfig,
  options: ComposeNavigationOptions = {},
): Response {
  const path = typeof config === "string" ? config : config.path;
  const locationConfig = typeof config === "string" ? {} : config;
  return composeNavigation(request, path, {
    ...options,
    locationConfig,
  });
}

/**
 * Creates an HX-Refresh response triggering a full page reload in the client.
 */
export function htmxRefresh(): Response {
  return applyDirectives(
    new Response(null, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
    [{ kind: "refresh" }],
  );
}
