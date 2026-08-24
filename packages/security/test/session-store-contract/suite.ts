/**
 * BR-061 reusable session-store conformance suite.
 *
 * Any adapter — the in-memory fixture today, a durable Redis/Postgres
 * adapter tomorrow — must pass this entire suite before it may back
 * security-sensitive flows. The suite is storage-agnostic: it drives ONLY
 * the public port.
 */
import { expect, test } from "bun:test";
import {
  assertSerializableSessionData,
  SessionStoreError,
  type SessionData,
  type SessionStore,
} from "../../src/session/store";

export function record(
  id: string,
  expiresAtMs: number,
  data: Record<string, unknown> = { role: "user" },
): SessionData {
  return { id, data, createdAtMs: 1_000, expiresAtMs };
}

/**
 * Runs every contract check against a FRESH store instance per test.
 * @param createStore factory producing an empty, ready-to-use store
 */
export function runSessionStoreContract(
  testNamePrefix: string,
  createStore: () => SessionStore,
): void {
  test(`${testNamePrefix}: commit/load round-trips a working copy`, async () => {
    const store = createStore();
    await store.commit(record("s1", Date.now() + 60_000, { role: "admin" }));
    const loaded = await store.load("s1");
    expect(loaded?.data).toEqual({ role: "admin" });
    // mutation without commit never leaks back
    loaded!.data["role"] = "attacker";
    expect((await store.load("s1"))!.data).toEqual({ role: "admin" });
  });

  test(`${testNamePrefix}: absolute expiry returns null and evicts`, async () => {
    const store = createStore();
    await store.commit(record("gone", Date.now() - 1));
    expect(await store.load("gone")).toBeNull();
  });

  test(`${testNamePrefix}: destroy makes the id permanently unloadable`, async () => {
    const store = createStore();
    await store.commit(record("dead", Date.now() + 60_000));
    await store.destroy("dead");
    expect(await store.load("dead")).toBeNull();
    // destroying an unknown id is a no-op, never an error
    await store.destroy("never-existed");
  });

  test(`${testNamePrefix}: touch extends expiry and reports missing sessions`, async () => {
    const store = createStore();
    const id = "sliding";
    await store.commit(record(id, Date.now() + 1_000));
    expect(await store.touch!(id, Date.now() + 120_000)).toBe(true);
    const extended = (await store.load(id))!;
    expect(extended.expiresAtMs).toBeGreaterThan(Date.now() + 100_000);

    await store.destroy(id);
    expect(await store.touch!(id, Date.now() + 5_000)).toBe(false);
  });

  test(`${testNamePrefix}: rotate atomically invalidates the old id`, async () => {
    const store = createStore();
    const oldId = "fixated";
    const newId = "fresh";
    await store.commit(record(oldId, Date.now() + 60_000));

    await store.rotate!(
      oldId,
      record(newId, Date.now() + 60_000, { role: "editor" }),
    );

    expect(await store.load(oldId)).toBeNull(); // fixation window closed
    const fresh = await store.load(newId);
    expect(fresh?.data).toEqual({ role: "editor" });
  });

  test(`${testNamePrefix}: concurrent read/touch/rotate/delete races keep one valid session`, async () => {
    const store = createStore();
    const oldId = "race-old";
    const newId = "race-new";
    await store.commit(record(oldId, Date.now() + 60_000));

    const outcomes = await Promise.allSettled([
      ...Array.from({ length: 8 }, () => store.load(oldId)),
      ...Array.from({ length: 4 }, () =>
        store.touch!(oldId, Date.now() + 30_000),
      ),
      store.rotate!(oldId, record(newId, Date.now() + 60_000)),
      ...Array.from({ length: 4 }, () => store.destroy(oldId)),
      ...Array.from({ length: 8 }, () => store.load(oldId)),
    ]);
    // CAS rotation MAY lose the race with a concurrent destroy — that is
    // the documented conflict path, not a contract failure.
    for (const outcome of outcomes) {
      if (outcome.status === "rejected") {
        expect(
          outcome.reason instanceof SessionStoreError &&
            outcome.reason.kind === "conflict",
        ).toBe(true);
      }
    }

    // Invariant after the storm: old id dead; new id live exactly when its
    // rotate won (memory adapter always wins here because destroy+rotate
    // ordering is event-loop serialized before any await).
    expect(await store.load(oldId)).toBeNull();
    expect((await store.load(newId))?.data).toEqual({ role: "user" });
  });

  test(`${testNamePrefix}: serialization rejects functions, symbols, prototype keys`, async () => {
    const store = createStore();
    for (const bad of [
      { fn: () => undefined },
      { sym: Symbol("x") } as unknown as Record<string, unknown>,
      { ["__proto__"]: { injected: true } },
      Object.assign(Object.create({ evil: true }), { ok: 1 }),
    ]) {
      expect(() => assertSerializableSessionData(bad)).toThrow(
        SessionStoreError,
      );
    }
    // commit path enforces the same guard
    await expect(
      store.commit(record("bad", Date.now() + 1_000, { cb: () => 1 })),
    ).rejects.toBeInstanceOf(SessionStoreError);
  });

  test(`${testNamePrefix}: declared capabilities match observed behavior`, () => {
    const store = createStore();
    expect(store.capabilities?.atomicRotate).toBe(true);
    expect(store.capabilities?.touch).toBe(true);
    if (!store.capabilities?.durable) {
      // non-durable fixtures are allowed only as explicit fixtures
      expect(testNamePrefix.toLowerCase()).toContain("memory");
    }
  });
}

// Re-exports so adapters can reuse types in their own suites.
export type { SessionStore };
