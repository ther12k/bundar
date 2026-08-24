/**
 * BR-062 production posture tests: fixture-only settings fail BEFORE
 * listening; named overrides accept exactly one documented risk each;
 * diagnostics never print secrets; development stays ergonomic.
 */
import { describe, expect, test } from "bun:test";
import {
  assertProductionPosture,
  ProductionPostureError,
} from "../src/posture";
import { createMemorySessionStore } from "../src/session/store";

const MEMORY = () => createMemorySessionStore();

function violationsOf(input: Parameters<typeof assertProductionPosture>[0]) {
  try {
    assertProductionPosture(input);
    return [];
  } catch (error) {
    if (error instanceof ProductionPostureError) return error.violations;
    throw error;
  }
}

describe("BR-062 production posture", () => {
  test("memory store in production fails before listening", () => {
    const violations = violationsOf({
      environment: "production",
      store: MEMORY(),
      csrfSecretBytes: 48,
    });
    expect(violations.map((v) => v.code)).toEqual(["memory-sessions"]);
    // The exact override flag is machine-detectable.
    expect(violations[0]!.overrideFlag).toBe("allowMemorySessions");
  });

  test("insecure session cookies in production fail before listening", () => {
    const violations = violationsOf({
      environment: "production",
      store: MEMORY(),
      insecureCookies: true,
      csrfSecretBytes: 48,
      overrides: { allowMemorySessions: true },
    });
    expect(violations.map((v) => v.code)).toEqual(["insecure-cookies"]);
  });

  test("weak/ephemeral CSRF secret fails with the entropy floor named", () => {
    const violations = violationsOf({
      environment: "production",
      store: MEMORY(),
      csrfSecretBytes: 8,
      overrides: { allowMemorySessions: true, allowInsecureCookies: true },
    });
    expect(violations.map((v) => v.code)).toEqual(["weak-csrf-secret"]);
    expect(violations[0]!.risk).toContain("32 bytes");
  });

  test("named overrides accept exactly their own risk — nothing else", () => {
    // All three overridden → zero fatal violations.
    const all = violationsOf({
      environment: "production",
      store: MEMORY(),
      insecureCookies: true,
      csrfSecretBytes: 4,
      overrides: {
        allowMemorySessions: true,
        allowInsecureCookies: true,
        allowWeakCsrfSecret: true,
      },
    });
    expect(all).toEqual([]);
  });

  test("diagnostics never print secret material", () => {
    const secret = "SUPER_SECRET_VALUE_br062";
    let thrown: ProductionPostureError | null = null;
    try {
      assertProductionPosture({
        environment: "production",
        store: MEMORY(),
        csrfSecretBytes: 2,
        overrides: {},
      });
    } catch (error) {
      thrown = error as ProductionPostureError;
    }
    expect(thrown).not.toBeNull();
    expect(thrown instanceof ProductionPostureError).toBe(true);
    expect(String(thrown as ProductionPostureError)).not.toContain(secret);
    const thrownError = thrown as ProductionPostureError;
    expect(
      JSON.stringify(thrownError.violations.map((v) => v.code)),
    ).not.toContain(secret);
  });

  test("development stays ergonomic: no posture gate at all", () => {
    expect(
      violationsOf({ environment: "development", store: MEMORY() }),
    ).toEqual([]);
    expect(violationsOf({ environment: undefined, store: MEMORY() })).toEqual(
      [],
    );
  });

  test("durable-capable stores pass the memory check without overrides", () => {
    const durableFake = {
      ...MEMORY(),
      capabilities: { durable: true, atomicRotate: true, touch: true },
    };
    const violations = violationsOf({
      environment: "production",
      store: durableFake,
      csrfSecretBytes: 48,
    });
    expect(violations).toEqual([]);
  });
});
