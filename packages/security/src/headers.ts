/**
 * Security headers, CSP, and nonce propagation (GH-066).
 *
 * Middleware that sets a restrictive, configurable response-header policy:
 * Content-Security-Policy (nonce-based script-src, no unsafe-inline),
 * X-Content-Type-Options, X-Frame-Options/frame-ancestors,
 * Referrer-Policy, Permissions-Policy, Strict-Transport-Security (prod),
 * and Cross-Origin-Opener-Policy. Per-response nonces are generated via
 * crypto.getRandomValues (unpredictable, request-scoped, never reused) and
 * propagated through context state for script/style helpers.
 *
 * Development relaxations are a separate, explicit mode — production
 * defaults are restrictive and fail-safe. Handler-set headers cannot
 * silently remove mandatory policy directives.
 */
import type { Context, Middleware } from "@bundar/core";

export interface SecurityHeaderPolicy {
  /**
   * BR-065: when a fresh nonce is embedded in this response's CSP, also
   * emit `Cache-Control: no-store` so shared caches cannot replay it.
   * Default true. (default: true)
   */
  readonly nonceNoStore?: boolean;
  /** CSP directives beyond the baseline; merged with mandatory policy. */
  readonly cspDirectives?: Readonly<Record<string, string>>;
  /** Allowed frame ancestors (`'self'`, specific origins). Default `'none'`. */
  readonly frameAncestors?: string;
  /** Referrer policy. Default `strict-origin-when-cross-origin`. */
  readonly referrerPolicy?: string;
  /** Permissions policy. Default disabling camera/microphone/geolocation. */
  readonly permissionsPolicy?: string;
  /** HSTS max-age in seconds; 0 disables. Production default: 31536000. */
  readonly hstsMaxAge?: number;
  /** Development mode relaxations (allows inline styles, localhost). */
  readonly development?: boolean;
}

export class SecurityHeaderError extends Error {
  public constructor(detail: string) {
    super(`security headers: ${detail}`);
    this.name = "SecurityHeaderError";
  }
}

const NONCE_STATE_KEY = Symbol.for("bundar.security.nonce");

/** Per-request nonce store (request-scoped, never reused). */
export interface NonceContext {
  /** The CSP nonce for this request — unpredictable, single-use. */
  readonly nonce: string;
  /** Builds a CSP string with the nonce injected into script-src/style-src. */
  cspHeader(): string;
}

function generateNonce(): string {
  // 16 bytes → base64 = 22 usable chars; unpredictable via CSPRNG
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Returns the request-scoped nonce context, or undefined if the security
 * headers middleware is not installed.
 */
export function getNonce(context: Context): NonceContext | undefined {
  const value = (context.state as Record<PropertyKey, unknown>)[
    NONCE_STATE_KEY
  ];
  return value === undefined ? undefined : (value as NonceContext);
}

interface MandatoryDirectives {
  readonly production: Readonly<Record<string, string>>;
  readonly development: Readonly<Record<string, string>>;
}

const MANDATORY_CSP: MandatoryDirectives = Object.freeze({
  production: Object.freeze({
    "default-src": "'self'",
    "script-src": "'self' 'nonce-{NONCE}'",
    "style-src": "'self'",
    "img-src": "'self' data:",
    "connect-src": "'self'",
    "font-src": "'self'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
  }),
  development: Object.freeze({
    "default-src": "'self'",
    "script-src": "'self' 'nonce-{NONCE}'",
    // development: inline styles allowed for hot-reload tooling
    "style-src": "'self' 'unsafe-inline'",
    "img-src": "'self' data: blob:",
    "connect-src": "'self' ws: wss: http://localhost:* https://localhost:*",
    "font-src": "'self' data:",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
  }),
});

/**
 * Builds the Content-Security-Policy header value from the mandatory
 * baseline plus caller extensions. The nonce placeholder is replaced with
 * the per-request value. Mandatory directives cannot be overridden —
 * caller duplicates are appended as additional sources, never removed.
 */
export function buildCspHeader(
  nonce: string,
  options: {
    readonly development?: boolean;
    readonly extra?: Readonly<Record<string, string>>;
  } = {},
): string {
  const base =
    options.development === true
      ? MANDATORY_CSP.development
      : MANDATORY_CSP.production;

  const merged: Record<string, string[]> = {};
  for (const [directive, value] of Object.entries(base)) {
    merged[directive] = [value.replace("{NONCE}", nonce)];
  }

  for (const [directive, value] of Object.entries(options.extra ?? {})) {
    const lower = directive.toLowerCase().trim();
    // Mandatory directives cannot be overridden — extend, never remove
    if (
      lower === "default-src" ||
      lower === "object-src" ||
      lower === "base-uri" ||
      lower === "frame-ancestors"
    ) {
      throw new SecurityHeaderError(
        `directive "${lower}" is mandatory and cannot be overridden`,
      );
    }
    if (merged[lower] === undefined) {
      merged[lower] = [value];
    } else {
      merged[lower].push(value);
    }
  }

  // Deterministic order for testability
  const orderedKeys = Object.keys(merged).sort();
  return orderedKeys
    .map((directive) => `${directive} ${merged[directive]!.join(" ")}`)
    .join("; ");
}

const HEADER_MAP = {
  csp: "content-security-policy",
  contentTypeOptions: "x-content-type-options",
  frameOptions: "x-frame-options",
  referrerPolicy: "referrer-policy",
  permissionsPolicy: "permissions-policy",
  hsts: "strict-transport-security",
  coop: "cross-origin-opener-policy",
} as const;

/**
 * Security headers middleware: installs the per-request nonce, builds the
 * CSP, and applies the full header set to the response. Handler-set CSP
 * values on the response are appended to (never replace) the middleware
 * policy — mandatory directives cannot be silently removed.
 */
export function securityHeaders(policy: SecurityHeaderPolicy = {}): Middleware {
  const development = policy.development === true;
  const frameAncestors = policy.frameAncestors ?? "'none'";
  const referrer = policy.referrerPolicy ?? "strict-origin-when-cross-origin";
  const permissions =
    policy.permissionsPolicy ?? "camera=(), microphone=(), geolocation=()";
  const hstsMaxAge = policy.hstsMaxAge ?? (development ? 0 : 31536000);

  return (context, next) => {
    const nonce = generateNonce();
    const cspValue = buildCspHeader(nonce, {
      development,
      extra: policy.cspDirectives,
    });

    const nonceContext: NonceContext = Object.freeze({
      nonce,
      cspHeader: () => cspValue,
    });
    (context.state as Record<PropertyKey, unknown>)[NONCE_STATE_KEY] =
      nonceContext;

    return Promise.resolve(next(context)).then((response) => {
      const headers = new Headers(response.headers);

      // CSP: middleware policy always set; handler-set CSP values are
      // appended (both apply), never replacing the mandatory policy
      const handlerCsp = headers.get(HEADER_MAP.csp);
      headers.set(
        HEADER_MAP.csp,
        handlerCsp === null ? cspValue : `${cspValue}; ${handlerCsp}`,
      );

      headers.set(HEADER_MAP.contentTypeOptions, "nosniff");

      // BR-065: a fresh per-response nonce makes this response inherently
      // unshareable — mark it no-store so caches can never serve a stale
      // nonce to a different request. Opt-out for apps managing their own
      // caching of nonce-free responses via policy.nonceNoStore=false.
      if (
        policy.nonceNoStore !== false &&
        (headers.get(HEADER_MAP.csp) ?? "").includes(nonce)
      ) {
        headers.set("cache-control", "no-store");
      }
      headers.set(
        HEADER_MAP.frameOptions,
        frameAncestors === "'none'" ? "DENY" : "SAMEORIGIN",
      );
      headers.set(HEADER_MAP.referrerPolicy, referrer);
      headers.set(HEADER_MAP.permissionsPolicy, permissions);
      if (hstsMaxAge > 0) {
        headers.set(HEADER_MAP.hsts, `max-age=${hstsMaxAge}`);
      }
      headers.set(HEADER_MAP.coop, "same-origin");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    });
  };
}
