/**
 * Session middleware (GH-062).
 *
 * Attaches a per-request session through a narrow store interface with
 * secure cookie defaults. Security properties:
 *
 * - The cookie carries ONLY the opaque server-generated id; all state lives
 *   behind the store (signed/encrypted cookie payloads were reviewed and
 *   deemed unnecessary — see docs/guides/sessions.md).
 * - Unknown, expired, or malformed ids yield a brand-new empty session —
 *   authentication state can never leak across requests or resurrect.
 * - `rotate()` issues a fresh id and destroys the old one server-side
 *   (session-fixation policy: call it on login/privilege change).
 * - `destroy()` invalidates the backing record AND clears the browser
 *   cookie (logout).
 * - Cookie policy defaults: HttpOnly, SameSite=Lax (documented: Strict
 *   breaks top-level login redirects; the CSRF middleware carries the
 *   strict protection), Path=/, no Domain, Secure unless explicitly
 *   disabled for local development, expiry aligned to the idle timeout.
 */
import type { Context, Middleware } from "@bundar/core";
import { generateSessionId, isCanonicalSessionId } from "./id";
import type { SessionData, SessionStore } from "./store";
import {
  CookiePolicyError,
  resolveCookieSecure,
  type CookieEnvironment,
} from "../cookies";
import type { ProxyTrustConfig } from "../proxy";
import { assertProductionPosture } from "../posture";

/** Well-known state key; handlers read the session via getSession(). */
export const SESSION = Symbol.for("bundar.security.session");

export class SessionError extends Error {
  public constructor(detail: string) {
    super(`session error: ${detail}`);
    this.name = "SessionError";
  }
}

export interface SessionHandle {
  /** Current id — changes after rotate() commits. */
  readonly id: string;
  get(key: string): unknown | undefined;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  /** True when this request created the session (no valid cookie arrived). */
  readonly isNew: boolean;
  /**
   * Issues a fresh id, preserving data, and destroys the old record on
   * commit. Call on login and privilege changes (fixation policy).
   */
  rotate(): void;
  /**
   * Invalidates the backing record and clears the cookie. Subsequent gets
   * on this handle return undefined; the request sees an empty session.
   */
  destroy(): void;
  readonly destroyed: boolean;
  readonly rotated: boolean;
}

export interface SessionMiddlewareOptions {
  readonly store: SessionStore;
  /** Cookie name. Default "bundar.session". */
  readonly cookie?: string;
  /** Inactivity window; expiry refreshes on every commit. Default 30 min. */
  readonly idleTimeoutMs?: number;
  /** Hard ceiling regardless of activity. Default 12 h. */
  readonly absoluteTimeoutMs?: number;
  /** Cookie Secure flag. Default true; disable only for local development. */
  readonly secure?: boolean;
  readonly domain?: string;
  /**
   * BR-060: when set, Secure derives from the NORMALIZED trusted origin
   * instead of the static flag; production http origins fail construction
   * (fail before listen).
   */
  readonly proxyTrust?: ProxyTrustConfig;
  readonly environment?: CookieEnvironment;
  readonly peer?: string | null;
  /** CSRF/session signing secret material; length feeds the posture gate. */
  readonly csrfSecret?: string;
  /** BR-062 named overrides — each accepts exactly one documented risk. */
  readonly allowMemorySessionsInProduction?: boolean;
  readonly allowInsecureCookies?: boolean;
  readonly allowWeakCsrfSecret?: boolean;
}

const DEFAULT_IDLE_MS = 30 * 60 * 1_000;
const DEFAULT_ABSOLUTE_MS = 12 * 60 * 60 * 1_000;
const SET_COOKIE_EPOCH = "Thu, 01 Jan 1970 00:00:00 GMT";

function readCookieId(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (header === null) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  const value = match?.[1];
  // Malformed/forged values are treated as absent, never as a lookup key.
  return isCanonicalSessionId(value) ? value : undefined;
}

function sessionCookie(
  name: string,
  id: string,
  expiresAtMs: number,
  options: SessionMiddlewareOptions,
  secureOverride?: boolean,
): string {
  const secure =
    secureOverride !== undefined ? secureOverride : options.secure !== false;
  const parts = [
    `${name}=${id}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${new Date(expiresAtMs).toUTCString()}`,
  ];
  if (secure) parts.push("Secure");
  if (options.domain !== undefined) parts.push(`Domain=${options.domain}`);
  return parts.join("; ");
}

function clearCookie(
  name: string,
  options: SessionMiddlewareOptions,
  secureOverride?: boolean,
): string {
  const parts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${SET_COOKIE_EPOCH}`,
  ];
  const secure =
    secureOverride !== undefined ? secureOverride : options.secure !== false;
  if (secure) parts.push("Secure");
  if (options.domain !== undefined) parts.push(`Domain=${options.domain}`);
  return parts.join("; ");
}

/**
 * The session middleware: load-or-create, expose a per-request handle,
 * then commit/rotate/destroy and apply the cookie policy on the response.
 */
export function sessionMiddleware(
  options: SessionMiddlewareOptions,
): Middleware {
  const cookieName = options.cookie ?? "bundar.session";
  /**
   * BR-060: with proxyTrust configured, Secure derives from the NORMALIZED
   * origin of each request (trusted https termination ⇒ Secure), falling
   * back to the static option only for direct deployments.
   */
  const resolveEffectiveSecure = (
    request: Request,
    peer: string | null,
  ): boolean => {
    if (options.proxyTrust !== undefined && options.environment !== undefined) {
      return resolveCookieSecure(
        {
          request,
          peer,
          trust: options.proxyTrust,
          environment: options.environment,
        },
        { allowInsecureDevelopment: options.secure === false },
      );
    }
    return options.secure !== false;
  };
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_MS;
  const absoluteTimeoutMs = options.absoluteTimeoutMs ?? DEFAULT_ABSOLUTE_MS;
  if (options.environment === "production") {
    // BR-062: fail BEFORE listening on fixture-only settings. Overrides are
    // explicit named flags; diagnostics never print secret material.
    assertProductionPosture({
      environment: "production",
      store: options.store,
      insecureCookies:
        options.secure === false && options.proxyTrust === undefined,
      csrfSecretBytes:
        options.csrfSecret !== undefined
          ? options.csrfSecret.length
          : undefined,
      overrides: {
        allowMemorySessions: options.allowMemorySessionsInProduction === true,
        allowInsecureCookies: options.allowInsecureCookies === true,
        allowWeakCsrfSecret: options.allowWeakCsrfSecret === true,
      },
    });
  }
  if (
    options.environment === "production" &&
    options.secure === false &&
    options.proxyTrust === undefined &&
    options.allowInsecureCookies !== true
  ) {
    throw new CookiePolicyError(
      "session middleware refuses production with explicit secure:false and no trusted-proxy configuration",
    );
  }
  if (idleTimeoutMs < 1 || absoluteTimeoutMs < idleTimeoutMs) {
    throw new SessionError(
      "idleTimeoutMs must be positive and not exceed absoluteTimeoutMs",
    );
  }

  return async (context, next) => {
    const cookieId = readCookieId(context.request, cookieName);
    let loaded: SessionData | null = null;
    if (cookieId !== undefined) {
      loaded = await options.store.load(cookieId);
    }

    const isNew = loaded === null;
    const currentId = loaded?.id ?? generateSessionId();
    const createdAtMs = loaded?.createdAtMs ?? Date.now();
    // Absolute ceiling is inherited from the record so activity can never
    // extend a session past its hard limit.
    const absoluteDeadline = Math.min(
      createdAtMs + absoluteTimeoutMs,
      Date.now() + idleTimeoutMs,
    );
    const data: Record<string, unknown> = { ...(loaded?.data ?? {}) };

    let rotated = false;
    let destroyed = false;
    const touched = new Set<string>();
    let dirty = false;

    const handle: SessionHandle = {
      get id() {
        return currentId;
      },
      get: (key: string) => (destroyed ? undefined : data[key]),
      set: (key: string, value: unknown) => {
        if (destroyed) throw new SessionError("set() after destroy()");
        data[key] = value;
        touched.add(key);
        dirty = true;
      },
      delete: (key: string) => {
        if (destroyed) throw new SessionError("delete() after destroy()");
        delete data[key];
        touched.add(key);
        dirty = true;
      },
      get isNew() {
        return isNew;
      },
      rotate: () => {
        if (destroyed) throw new SessionError("rotate() after destroy()");
        rotated = true;
        dirty = true;
      },
      destroy: () => {
        destroyed = true;
      },
      get destroyed() {
        return destroyed;
      },
      get rotated() {
        return rotated;
      },
    };
    (context.state as Record<PropertyKey, unknown>)[SESSION] = handle;

    const secureOverride =
      options.proxyTrust !== undefined && options.environment !== undefined
        ? resolveEffectiveSecure(context.request, options.peer ?? null)
        : undefined;

    const response = await next(context);

    const headers = new Headers(response.headers);
    if (destroyed) {
      if (cookieId !== undefined) await options.store.destroy(cookieId);
      headers.append(
        "set-cookie",
        clearCookie(cookieName, options, secureOverride),
      );
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    const finalId = rotated ? generateSessionId() : currentId;
    if (dirty || isNew || rotated) {
      if (
        rotated &&
        !isNew &&
        cookieId !== undefined &&
        typeof options.store.rotate === "function" &&
        options.store.capabilities?.atomicRotate === true
      ) {
        // BR-063: ATOMIC rotation when the store supports it. A "conflict"
        // means another request consumed this session first — propagate so
        // exactly one privileged session survives the race.
        await options.store.rotate(cookieId, {
          id: finalId,
          data,
          createdAtMs,
          expiresAtMs: absoluteDeadline,
        });
      } else {
        if (rotated && !isNew && cookieId !== undefined) {
          // Fixation policy fallback for non-atomic stores.
          await options.store.destroy(cookieId);
        }
        await options.store.commit({
          id: finalId,
          data,
          createdAtMs,
          expiresAtMs: absoluteDeadline,
        });
      }
      headers.append(
        "set-cookie",
        sessionCookie(
          cookieName,
          finalId,
          absoluteDeadline,
          options,
          secureOverride,
        ),
      );
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/** Reads the request's session handle (undefined without the middleware). */
export function getSession(context: Context): SessionHandle | undefined {
  const value = (context.state as Record<PropertyKey, unknown>)[SESSION];
  return value === undefined ? undefined : (value as SessionHandle);
}
