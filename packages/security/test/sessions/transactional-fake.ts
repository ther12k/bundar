/**
 * BR-063 transactional FAKE durable adapter: durable-capable semantics on
 * an in-process Map with queued (event-loop-serialized) mutations. Exists
 * to prove the conformance suite and middleware run identically against a
 * store that DECLARES production capabilities.
 */
import {
  SessionStoreError,
  assertSerializableSessionData,
  type SessionData,
  type SessionStore,
} from "../../src/session/store";

export function createTransactionalFakeSessionStore(): SessionStore {
  const entries = new Map<string, SessionData>();

  const clone = (record: SessionData): SessionData => ({
    ...record,
    data: structuredClone(record.data),
  });

  return {
    capabilities: { durable: true, atomicRotate: true, touch: true },

    async load(id) {
      await Promise.resolve(); // simulate at least one tick like real IO
      const record = entries.get(id);
      if (record === undefined || record.expiresAtMs <= Date.now()) return null;
      return clone(record);
    },
    async commit(record) {
      assertSerializableSessionData(record.data);
      await Promise.resolve();
      entries.set(record.id, clone(record));
    },
    async destroy(id) {
      await Promise.resolve();
      entries.delete(id);
    },
    async touch(id, expiresAtMs) {
      await Promise.resolve();
      const record = entries.get(id);
      if (record === undefined || record.expiresAtMs <= Date.now())
        return false;
      entries.set(id, { ...record, expiresAtMs });
      return true;
    },
    async rotate(oldId, record) {
      assertSerializableSessionData(record.data);
      await Promise.resolve();
      // CAS: concurrent consumption wins the race, we lose with "conflict".
      if (!entries.has(oldId)) {
        throw new SessionStoreError(
          "conflict",
          `rotation lost: "${oldId}" already consumed`,
        );
      }
      entries.delete(oldId);
      entries.set(record.id, clone(record));
    },
  };
}
