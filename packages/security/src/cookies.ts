/**
 * Cookie policy derivation (BR-060).
 *
 * Secure/host policy comes from the NORMALIZED trusted request origin
 * (ADR-0020) — never from raw forwarded headers. Production posture
 * refuses to silently emit insecure session cookies, and dangerous
 * attribute combinations fail construction.
 */
import type { ProxyTrustConfig } from "./proxy";
import { resolveClient } from "./proxy";

export type CookieEnvironment = "development" | "production";

export interface CookieOriginInput {
  /** Incoming request whose normalized origin is resolved. */
  readonly request: Request;
  /** Transport peer address from the server runtime. */
  readonly peer: string | null;
  /** Explicit proxy trust; omitted = direct-only (fail-closed). */
  readonly trust?: ProxyTrustConfig;
  readonly environment: CookieEnvironment;
}

export class CookiePolicyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CookiePolicyError";
  }
}

/**
 * Derives the Secure flag from the normalized origin:
 * trusted https termination → true; plain direct http in development →
 * false ONLY when explicitly allowed; production http → hard failure
 * (never silent).
 */
export function resolveCookieSecure(
  input: CookieOriginInput,
  options: {
    /** Developer escape hatch; ignored in production. */
    readonly allowInsecureDevelopment?: boolean;
    /** Explicit application override; audited against environment. */
    readonly requireSecureOverride?: boolean;
  } = {},
): boolean {
  const resolved = resolveClient(input.request, input.peer, input.trust);
  const isHttps = resolved.proto === "https";

  if (input.environment === "production") {
    if (!isHttps) {
      // Localhost development servers are not a production concern; a
      // production deployment resolving to http is a MISCONFIGURATION.
      throw new CookiePolicyError(
        "production cookie policy requires an https origin (direct or trusted-proxy terminated); refusing to emit insecure cookies",
      );
    }
    return true;
  }

  // Development: https origins are always secure; http needs the explicit
  // development allowance so fixtures cannot accidentally ship insecure.
  if (!isHttps && options.allowInsecureDevelopment !== true) {
    throw new CookiePolicyError(
      "development http origin requires allowInsecureDevelopment: true (fixtures use secure: false explicitly)",
    );
  }
  return isHttps;
}

export interface CookieAttributeContract {
  readonly name: string;
  readonly sameSite?: "Strict" | "Lax" | "None";
  readonly secure: boolean;
  readonly path?: string;
  readonly domain?: string;
}

/**
 * Validates dangerous combinations BEFORE serialization:
 * - `SameSite=None` requires `Secure`.
 * - `__Host-` prefix requires Secure + Path=/ + NO Domain.
 */
export function validateCookieAttributes(
  contract: CookieAttributeContract,
): void {
  const sameSite = contract.sameSite ?? "Lax";
  if (sameSite === "None" && !contract.secure) {
    throw new CookiePolicyError(
      "SameSite=None requires Secure; insecure cross-site cookies are rejected",
    );
  }
  if (contract.name.startsWith("__Host-")) {
    if (!contract.secure) {
      throw new CookiePolicyError("__Host- cookies require Secure");
    }
    if ((contract.path ?? "/") !== "/") {
      throw new CookiePolicyError("__Host- cookies require Path=/");
    }
    if (contract.domain !== undefined) {
      throw new CookiePolicyError("__Host- cookies must not set Domain");
    }
  }
}
