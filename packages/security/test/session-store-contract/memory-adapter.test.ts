/**
 * BR-061: the memory fixture must pass the full conformance suite, and the
 * production-posture gate must reject stores that fall below it.
 */
import { describe, expect, test } from "bun:test";
import {
  createMemorySessionStore,
  requireProductionSessionCapabilities,
  SessionStoreError,
} from "../../src/session/store";
import { runSessionStoreContract } from "./suite";

describe("BR-061 memory adapter conformance", () => {
  runSessionStoreContract("memory store", () => createMemorySessionStore());

  test("production posture rejects undeclared or non-atomic stores", () => {
    expect(() =>
      requireProductionSessionCapabilities(createMemorySessionStore()),
    ).not.toThrow();

    const degraded = createMemorySessionStore();
    delete (
      degraded as unknown as {
        capabilities?: Record<string, boolean>;
      }
    ).capabilities;
    try {
      requireProductionSessionCapabilities(degraded);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SessionStoreError);
      expect((error as SessionStoreError).kind).toBe("unavailable");
    }

    // Explicit degraded mode is permitted but loud at construction site.
    expect(() =>
      requireProductionSessionCapabilities(degraded, {
        allowDegradedNonProduction: true,
      }),
    ).not.toThrow();
  });
});
