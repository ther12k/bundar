/**
 * Production posture validation (BR-062).
 *
 * Known fixture-only settings cannot reach production silently. Every
 * override NAMES the exact risk it accepts, is machine-detectable via the
 * violation code list, and is never enabled by reference templates.
 *
 * Fatal vs advisory:
 * - FATAL: memory-backed sessions, insecure session cookies, weak CSRF
 *   secret entropy.
 * - ADVISORY: no trusted-proxy configuration (direct TLS is a legitimate
 *   production deployment per ADR-0020).
 */

import type { SessionStore } from "./session/store";

export type PostureViolationCode =
  "memory-sessions" | "insecure-cookies" | "weak-csrf-secret";

export interface PostureViolation {
  readonly code: PostureViolationCode;
  /** Names the EXACT risk accepted by any matching override flag. */
  readonly risk: string;
  readonly overrideFlag:
    "allowMemorySessions" | "allowInsecureCookies" | "allowWeakCsrfSecret";
}

export class ProductionPostureError extends Error {
  public readonly violations: readonly PostureViolation[];

  public constructor(violations: readonly PostureViolation[]) {
    super(
      `production posture violations: ${violations
        .map((v) => `${v.code} (${v.risk}; override: ${v.overrideFlag})`)
        .join("; ")}`,
    );
    this.name = "ProductionPostureError";
    this.violations = violations;
  }
}

export interface ProductionPostureInput {
  /** Normalized environment; production triggers the gate. */
  readonly environment: string | undefined;
  readonly store: SessionStore;
  /** Session middleware configured secure:false explicitly. */
  readonly insecureCookies?: boolean;
  /** Byte length of the CSRF/session signing secret. */
  readonly csrfSecretBytes?: number;
  readonly overrides?: {
    readonly allowMemorySessions?: boolean;
    readonly allowInsecureCookies?: boolean;
    readonly allowWeakCsrfSecret?: boolean;
  };
}

const MIN_SECRET_BYTES = 32;

/** Weak = below entropy floor OR obviously placeholder material. */
function isWeakSecret(bytes: number | undefined): boolean {
  if (bytes === undefined) return true;
  return bytes < MIN_SECRET_BYTES;
}

/**
 * Throws {@link ProductionPostureError} listing every fatal violation when
 * running in production with fixture-only settings.
 */
export function assertProductionPosture(input: ProductionPostureInput): void {
  const environment = (input.environment ?? "").toLowerCase();
  if (environment !== "production") return;

  const violations: PostureViolation[] = [];

  if (input.store.capabilities?.durable !== true) {
    violations.push({
      code: "memory-sessions",
      risk: "sessions are lost on restart and not shared across processes",
      overrideFlag: "allowMemorySessions",
    });
  }

  if (input.insecureCookies === true) {
    violations.push({
      code: "insecure-cookies",
      risk: "session cookies lack the Secure flag over the wire",
      overrideFlag: "allowInsecureCookies",
    });
  }

  if (isWeakSecret(input.csrfSecretBytes)) {
    violations.push({
      code: "weak-csrf-secret",
      risk: `signing secret below ${MIN_SECRET_BYTES} bytes of entropy`,
      overrideFlag: "allowWeakCsrfSecret",
    });
  }

  const overrides = input.overrides ?? {};
  const fatal = violations.filter((v) => {
    switch (v.overrideFlag) {
      case "allowMemorySessions":
        return overrides.allowMemorySessions !== true;
      case "allowInsecureCookies":
        return overrides.allowInsecureCookies !== true;
      case "allowWeakCsrfSecret":
        return overrides.allowWeakCsrfSecret !== true;
    }
  });

  if (fatal.length > 0) throw new ProductionPostureError(fatal);
}
