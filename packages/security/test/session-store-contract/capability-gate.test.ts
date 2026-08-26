/**
 * BR-063 re-review: production session capability enforcement — the
 * middleware construction gate must reject stores below the capability
 * floor (durable + atomicRotate + touch with real implementations).
 */
import { describe, expect, test } from "bun:test";
import {
  createMemorySessionStore,
  requireProductionSessionCapabilities,
  type SessionStore,
} from "../../src/session/store";
import { sessionMiddleware } from "../../src/session/middleware";

function makeGate(store: SessionStore) {
  return () => requireProductionSessionCapabilities(store);
}

describe("BR-063 production capability enforcement", () => {
  test("durable=true, atomicRotate=false -> rejected", () => {
    const store: SessionStore = {
      ...createMemorySessionStore(),
      capabilities: { durable: true, atomicRotate: false, touch: true },
    };
    expect(makeGate(store)).toThrow(/atomicRotate missing/);
  });

  test("durable=true, touch=false -> rejected", () => {
    const store: SessionStore = {
      ...createMemorySessionStore(),
      capabilities: { durable: true, atomicRotate: true, touch: false },
    };
    expect(makeGate(store)).toThrow(/touch/);
  });

  test("atomicRotate=true but rotate method missing -> rejected", () => {
    const store = createMemorySessionStore();
    (store as unknown as { rotate?: unknown }).rotate = undefined;
    expect(makeGate(store)).toThrow(/rotate\(\) not implemented/);
  });

  test("touch=true but touch method missing -> rejected", () => {
    const store = createMemorySessionStore();
    (store as unknown as { touch?: unknown }).touch = undefined;
    expect(makeGate(store)).toThrow(/touch\(\) not implemented/);
  });

  test("full capabilities present -> accepted", () => {
    const store = createMemorySessionStore();
    expect(() => makeGate(store)).not.toThrow();
  });

  test("middleware construction refuses non-compliant store in production", () => {
    const degraded: SessionStore = {
      ...createMemorySessionStore(),
      capabilities: { durable: true, atomicRotate: false, touch: true },
    };
    expect(() =>
      sessionMiddleware({
        store: degraded,
        csrfSecret: "s".repeat(48),
        secure: true,
        allowMemorySessionsInProduction: true,
        environment: "production",
      }),
    ).toThrow(/atomicRotate missing/);
  });
});
