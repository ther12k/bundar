/**
 * CSRF primitives (GH-061).
 *
 * Threat model: cross-site request forgery against cookie-authenticated
 * state-changing requests (unsafe methods). Defense is the synchronizer
 * token pattern — an HMAC-SHA-256-signed token bound to the session cookie
 * value, with embedded expiry, issued through a cookie and submitted through
 * a hidden form field (no-JS) or a header (HTMX) — plus Origin /
 * Sec-Fetch-Site verification with a documented fail-closed fallback.
 * Tokens are compared in constant time. This is NOT an XSS defense: tokens
 * do not replace output escaping or CSP.
 *
 * Token format (base64url, dot-joined): `expiryMs.nonce.mac` where
 * `mac = HMAC-SHA256(secret, binding | expiry | nonce)`. The binding is the
 * current session cookie value, so a token minted for one session fails for
 * another without any server-side state.
 */
import {
  CookieMutations,
  HttpError,
  serializeCookie,
  withSetCookie,
} from "@bundar/core";
import type { Context, Middleware } from "@bundar/core";
import { parseForm } from "@bundar/core";
import { getSession } from "./session/middleware";

const DEFAULT_TTL_MS = 30 * 60 * 1_000; // 30 minutes
const DEFAULT_TOKEN_COOKIE = "bundar.csrf";
export const CSRF_FORM_FIELD = "_csrf";
export const CSRF_HEADER = "x-csrf-token";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Server-side HMAC key for token signing. Never leaves the process. */
export interface CsrfSecret {
  readonly kind: "csrf-secret";
  readonly bytes: Uint8Array;
}

export function createCsrfSecret(): CsrfSecret {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return { kind: "csrf-secret", bytes };
}

export interface IssuedCsrfToken {
  readonly token: string;
  readonly expiresAtMs: number;
}

export type CsrfFailureReason =
  "missing" | "malformed" | "expired" | "binding-mismatch" | "replayed";

export type CsrfVerdict =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: CsrfFailureReason };

/** Constant-time equality — no early exit on first differing byte. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let index = 0; index < a.byteLength; index += 1) {
    diff |= a[index]! ^ b[index]!;
  }
  return diff === 0;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(
  secret: CsrfSecret,
  binding: string,
  expiryMs: number,
  nonce: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    // exact-size copy so the key material is a standalone ArrayBuffer
    secret.bytes.slice().buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = new TextEncoder().encode(`${binding}|${expiryMs}|${nonce}`);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return toHex(new Uint8Array(signature));
}

/**
 * Issues a token bound to `binding` (the session cookie value). State-free:
 * validity is verifiable later from the secret + binding alone.
 */
export async function issueCsrfToken(
  secret: CsrfSecret,
  binding: string,
  options: { readonly ttlMs?: number } = {},
): Promise<IssuedCsrfToken> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAtMs = Date.now() + ttlMs;
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = base64UrlEncode(nonceBytes);
  const mac = await hmac(secret, binding, expiresAtMs, nonce);
  return { token: `${expiresAtMs}.${nonce}.${mac}`, expiresAtMs };
}

/**
 * Verifies a token against the same binding, in constant time where it
 * matters (the MAC comparison). Reasons: missing / malformed / expired /
 * binding-mismatch. Replay prohibition is the store's concern (see
 * csrfMiddleware with requireSingleUse).
 */
export async function verifyCsrfToken(
  secret: CsrfSecret,
  binding: string,
  token: string | null | undefined,
  now: number = Date.now(),
): Promise<CsrfVerdict> {
  if (token === null || token === undefined || token.length === 0) {
    return { valid: false, reason: "missing" };
  }
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, reason: "malformed" };
  const [expiryText, nonce, mac] = parts as [string, string, string];
  const expiryMs = Number(expiryText);
  if (!Number.isFinite(expiryMs) || mac.length === 0 || nonce.length === 0) {
    return { valid: false, reason: "malformed" };
  }
  const expected = await hmac(secret, binding, expiryMs, nonce);
  // Constant-time compare of the provided vs computed MAC.
  const equal = constantTimeEqual(
    new TextEncoder().encode(mac),
    new TextEncoder().encode(expected),
  );
  if (!equal) return { valid: false, reason: "binding-mismatch" };
  if (now > expiryMs) return { valid: false, reason: "expired" };
  return { valid: true };
}

export type OriginVerdict =
  { readonly valid: true } | { readonly valid: false; readonly reason: string };

/**
 * Origin policy for unsafe methods, fail closed:
 *
 * 1. `Sec-Fetch-Site` present: must be `same-origin` (the modern, hardest
 *    signal). `same-site`/`cross-site` are rejected for state changes.
 * 2. Otherwise `Origin` present: must equal the request's own origin or be
 *    listed in `allowedOrigins`.
 * 3. Neither header present: rejected — browsers send `Origin` on every
 *    non-GET form submission and fetch, so absence indicates a non-browser
 *    or a stripped request.
 */
export function verifyOrigin(
  request: Request,
  options: { readonly allowedOrigins?: readonly string[] } = {},
): OriginVerdict {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin"
      ? { valid: true }
      : { valid: false, reason: `sec-fetch-site ${fetchSite}` };
  }
  const origin = request.headers.get("origin");
  if (origin === null || origin.length === 0) {
    return { valid: false, reason: "no origin evidence" };
  }
  const own = new URL(request.url).origin;
  if (origin === own) return { valid: true };
  if ((options.allowedOrigins ?? []).includes(origin)) return { valid: true };
  return { valid: false, reason: `origin ${origin}` };
}

/** Public 403 envelope; the reason stays server-side (never serialized). */
export class CsrfError extends HttpError {
  /** Server-side diagnostic only — never rendered into the response. */
  public readonly verificationReason: string;

  public constructor(reason: string) {
    super("forbidden", "request verification failed");
    this.name = "CsrfError";
    this.verificationReason = reason;
  }
}

export interface TokenStore {
  /** Records a token as consumed; false when it was already consumed. */
  consume(token: string, expiresAtMs: number): Promise<boolean> | boolean;
}

/** Single-process default store for optional replay prohibition. */
export function createInMemoryTokenStore(): TokenStore {
  const consumed = new Map<string, number>();
  return {
    consume(token: string, expiresAtMs: number) {
      const now = Date.now();
      if (consumed.has(token)) return false;
      consumed.set(token, expiresAtMs);
      if (consumed.size > 10_000) {
        for (const [key, expiry] of consumed) {
          if (expiry < now) consumed.delete(key);
        }
      }
      return true;
    },
  };
}

export interface CsrfMiddlewareOptions {
  readonly secret: CsrfSecret;
  /** Cookie whose value binds tokens (session identity). Default "bundar.session". */
  readonly sessionCookie?: string;
  /** Cookie through which the current token is issued. Default "bundar.csrf". */
  readonly tokenCookie?: string;
  readonly allowedOrigins?: readonly string[];
  /** Reject tokens that were already used once (requires a store). */
  readonly requireSingleUse?: boolean;
  readonly store?: TokenStore;
  /** Total handler budget applies to token reads too (default 10s/1MiB caps). */
  readonly maxTokenBodyBytes?: number;
}

function bindingOf(context: Context, sessionCookie: string): string {
  // The raw session cookie value is the binding; anonymous sessions bind to
  // a stable empty string only when no session exists (documented: protect
  // authenticated state, issue per-visitor tokens otherwise).
  return (
    context.request.headers
      .get("cookie")
      ?.match(new RegExp(`(?:^|;\\s*)${sessionCookie}=([^;]*)`))?.[1] ?? ""
  );
}

async function tokenFromRequest(
  context: Context,
  maxBytes: number,
): Promise<{ token: string | null; expiresAtMs: number | null }> {
  const headerToken = context.request.headers.get(CSRF_HEADER);
  if (headerToken !== null && headerToken.length > 0) {
    return { token: headerToken, expiresAtMs: null };
  }
  // Hidden form field: read from a CLONE so the handler's parseForm still
  // sees the original body (single-consumption preserved end to end).
  const contentType = context.request.headers.get("content-type") ?? "";
  if (
    contentType.split(";")[0] !== "application/x-www-form-urlencoded" &&
    contentType.split(";")[0] !== "multipart/form-data" &&
    contentType.split(";")[0] !== "text/plain"
  ) {
    return { token: null, expiresAtMs: null };
  }
  try {
    const clone = context.request.clone();
    const form = await parseForm(
      createCloneContext(clone as unknown as Request),
      { maxBytes },
    );
    const token = form.get(CSRF_FORM_FIELD);
    return { token, expiresAtMs: null };
  } catch {
    // unreadable/oversized body → no token → verification fails closed
    return { token: null, expiresAtMs: null };
  }
}

// parseForm needs a Context; a minimal structural context for the clone.
function createCloneContext(request: Request): Context {
  return {
    request,
    params: {},
    state: {},
  } as unknown as Context;
}

function setTokenCookie(
  response: Response,
  cookieName: string,
  token: string,
  expiresAtMs: number,
): Response {
  const mutations = new CookieMutations();
  mutations.set(cookieName, token, {
    expires: new Date(expiresAtMs),
    httpOnly: true,
    sameSite: "Strict",
    path: "/",
  });
  const headers = new Headers(response.headers);
  for (const cookie of mutations.serialize()) {
    headers.append("set-cookie", cookie);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * CSRF middleware (GH-061):
 *
 * - Safe methods never rotate or consume tokens; they only issue a token
 *   cookie when none exists yet (first visit renders the form).
 * - Unsafe methods verify Origin/Sec-Fetch-Site AND the submitted token
 *   (header first, then hidden field read from a request clone so the
 *   handler's body stays unconsumed), then rotate the token on success.
 * - Any failure throws a generic 403 `CsrfError`; reasons stay server-side.
 */
export function csrfMiddleware(options: CsrfMiddlewareOptions): Middleware {
  const sessionCookie = options.sessionCookie ?? "bundar.session";
  const tokenCookie = options.tokenCookie ?? DEFAULT_TOKEN_COOKIE;
  const maxBytes = options.maxTokenBodyBytes ?? 1_048_576;

  return async (context, next) => {
    const binding = bindingOf(context, sessionCookie);
    const currentTokenCookie = context.request.headers
      .get("cookie")
      ?.match(new RegExp(`(?:^|;\\s*)${tokenCookie}=([^;]*)`))?.[1];

    if (!UNSAFE_METHODS.has(context.request.method)) {
      const response = await next(context);
      // Issue-only on safe methods: never rotate an existing token.
      if (currentTokenCookie !== undefined) return response;
      const issued = await issueCsrfToken(options.secret, binding);
      return setTokenCookie(
        response,
        tokenCookie,
        issued.token,
        issued.expiresAtMs,
      );
    }

    const origin = verifyOrigin(context.request, {
      allowedOrigins: options.allowedOrigins,
    });
    if (!origin.valid) {
      throw new CsrfError(`origin: ${origin.reason}`);
    }

    const { token } = await tokenFromRequest(context, maxBytes);
    // The submitted token must match the cookie-issued one (synchronizer
    // pattern) AND verify against the binding.
    const cookieVerdict = await verifyCsrfToken(
      options.secret,
      binding,
      currentTokenCookie,
    );
    if (!cookieVerdict.valid) {
      throw new CsrfError(`cookie token: ${cookieVerdict.reason}`);
    }
    const submittedVerdict = await verifyCsrfToken(
      options.secret,
      binding,
      token,
    );
    if (!submittedVerdict.valid) {
      throw new CsrfError(`submitted token: ${submittedVerdict.reason}`);
    }
    if (token !== currentTokenCookie) {
      throw new CsrfError("submitted token does not match the issued token");
    }
    if (options.requireSingleUse) {
      const store = options.store;
      if (store === undefined) {
        throw new CsrfError("single-use required without a store");
      }
      const fresh = await store.consume(token!, Date.now() + DEFAULT_TTL_MS);
      if (!fresh) throw new CsrfError("replayed token");
    }

    const response = await next(context);
    // Rotate after every verified state change. A 4xx/5xx response changed
    // nothing: the verified token stays valid so a re-rendered form (e.g.
    // a 422 re-render with field errors) can resubmit without a re-fetch.
    if (response.status >= 400) return response;
    const issued = await issueCsrfToken(options.secret, binding);
    return setTokenCookie(
      response,
      tokenCookie,
      issued.token,
      issued.expiresAtMs,
    );
  };
}

/**
 * BR-055 composition helpers: applications compose the synchronizer flow
 * through these instead of re-parsing framework cookies or hand-building
 * Set-Cookie headers.
 */

/** Reads the current CSRF token cookie from a request (no app-side regex). */
export function readCsrfTokenFromRequest(
  request: Request,
  cookieName = "bundar.csrf",
): string {
  return (
    request.headers
      .get("cookie")
      ?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`))?.[1] ?? ""
  );
}

/**
 * Issues a session-bound page token (GH-069 contract) in one call.
 */
export async function issuePageCsrfToken(
  secret: CsrfSecret,
  context: Context,
  cookieName = "bundar.csrf",
): Promise<IssuedCsrfToken & { readonly cookieName: string }> {
  const session = getSession(context);
  const issued = await issueCsrfToken(secret, session?.id ?? "");
  return { ...issued, cookieName };
}

/**
 * Attaches the page token as the authoritative CSRF cookie. When
 * `replaceSameName` is set, any middleware-issued anonymous token is
 * superseded so clients see exactly one matching value.
 */
export function withCsrfCookie(
  response: Response,
  token: { token: string; expiresAtMs: number },
  options: { replaceSameName?: boolean } = {},
): Response {
  return withSetCookie(
    response,
    serializeCookie("bundar.csrf", token.token, {
      expires: new Date(token.expiresAtMs),
      httpOnly: true,
      sameSite: "Strict",
    }),
    options,
  );
}
