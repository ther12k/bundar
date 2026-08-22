/**
 * Session store interface (GH-062).
 *
 * A deliberately narrow, storage-agnostic contract: load, commit, destroy.
 * Bundar ships no database coupling — applications attach Redis, PostgreSQL,
 * or any durable backend behind these three methods. The in-memory store
 * below exists for tests and single-process demos ONLY and says so in its
 * name and documentation; production requires a durable store (see
 * docs/guides/sessions.md).
 */
export interface SessionData {
  readonly id: string;
  /** Application state; the store treats it as opaque. */
  data: Record<string, unknown>;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
}

export interface SessionStore {
  /** Returns the stored record, or null when unknown/expired. */
  load(id: string): Promise<SessionData | null>;
  /** Upserts the record under its current id with its expiry. */
  commit(record: SessionData): Promise<void>;
  /** Removes the record so the id can never load again. */
  destroy(id: string): Promise<void>;
}

/**
 * In-memory store for tests and single-process demos. EXPLICITLY UNSUITABLE
 * FOR PRODUCTION: no persistence across restarts, no cross-process sharing,
 * and entries live until expiry sweep. Production requires a durable store.
 */
export function createMemorySessionStore(
  options: { readonly maxEntries?: number } = {},
): SessionStore {
  const maxEntries = options.maxEntries ?? 100_000;
  const entries = new Map<string, SessionData>();

  const sweep = (now: number): void => {
    for (const [id, record] of entries) {
      if (record.expiresAtMs <= now) entries.delete(id);
    }
  };

  return {
    async load(id: string): Promise<SessionData | null> {
      const record = entries.get(id);
      if (record === undefined) return null;
      if (record.expiresAtMs <= Date.now()) {
        entries.delete(id);
        return null;
      }
      // Return a working copy: mutation without commit never leaks back.
      return {
        ...record,
        data: { ...record.data },
      };
    },
    async commit(record: SessionData): Promise<void> {
      if (entries.size >= maxEntries) sweep(Date.now());
      if (entries.size >= maxEntries) {
        // Fail closed rather than grow without bound.
        throw new Error(
          "memory session store exceeded maxEntries; use a durable store in production",
        );
      }
      entries.set(record.id, {
        ...record,
        data: { ...record.data },
      });
    },
    async destroy(id: string): Promise<void> {
      entries.delete(id);
    },
  };
}
