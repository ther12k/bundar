/**
 * Session store interface (GH-062, BR-061).
 *
 * A deliberately narrow, storage-agnostic contract with EXPLICIT security
 * capabilities: load, commit, destroy are the baseline; `touch` and
 * `rotate` declare idle-expiry and ATOMIC rotation support. Production
 * posture requires `atomicRotate` — a naïve "create new then delete old"
 * sequence can transiently leave BOTH sessions valid across processes.
 *
 * Failure classification: stores throw {@link SessionStoreError} with a
 * machine-readable `kind`. Security helpers must never silently mint a
 * fresh anonymous session after a protected mutation fails at the store.
 */
export interface SessionData {
  readonly id: string;
  /** Application state; the store treats it as opaque but MUST validate serializability. */
  data: Record<string, unknown>;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
}

/** Machine-readable failure classes for session persistence. */
export type SessionStoreFailureKind =
  "unavailable" | "conflict" | "serialization";

export class SessionStoreError extends Error {
  readonly kind: SessionStoreFailureKind;
  override readonly cause?: unknown;

  public constructor(
    kind: SessionStoreFailureKind,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "SessionStoreError";
    this.kind = kind;
    this.cause = cause;
  }
}

export interface SessionStoreCapabilities {
  /** Survives process restarts and is shared across processes. */
  readonly durable: boolean;
  /** `rotate()` swaps ids in one atomic operation (no dual-valid window). */
  readonly atomicRotate: boolean;
  /** Supports idle-expiry extension via `touch()`. */
  readonly touch: boolean;
}

export interface SessionStore {
  /** Returns the stored record, or null when unknown/expired. */
  load(id: string): Promise<SessionData | null>;
  /** Upserts the record under its current id with its expiry. */
  commit(record: SessionData): Promise<void>;
  /** Removes the record so the id can never load again. */
  destroy(id: string): Promise<void>;

  /**
   * Idle-expiry extension. Optional; absence means the adapter does not
   * support sliding windows and callers must re-commit instead.
   * @returns true when the session existed and was extended.
   */
  touch?(id: string, expiresAtMs: number): Promise<boolean>;

  /**
   * ATOMIC rotation: persists `record` under its NEW id and invalidates
   * `oldId` as one indivisible operation. Required for login/privilege
   * changes (session-fixation defense). Absence is a production-posture
   * violation — see {@link requireProductionSessionCapabilities}.
   *
   * COMPARE-AND-SWAP semantics: if `oldId` has already been consumed
   * (rotated/destroyed by a concurrent request), adapters throw
   * {@link SessionStoreError} with kind "conflict" — callers treat that as
   * losing the rotation race (exactly one privileged session survives).
   */
  rotate?(oldId: string, record: SessionData): Promise<void>;

  /** Declared behavior surface; verified against actual conformance runs. */
  readonly capabilities?: SessionStoreCapabilities;
}

/**
 * Rejects a store whose declared capabilities fall below the required
 * production floor, unless the caller EXPLICITLY accepts a degraded,
 * non-production mode.
 */
export function requireProductionSessionCapabilities(
  store: SessionStore,
  options: { allowDegradedNonProduction?: boolean } = {},
): void {
  const capabilities = store.capabilities;
  const problems: string[] = [];
  if (capabilities === undefined) {
    problems.push("capabilities not declared");
  } else {
    if (!capabilities.atomicRotate)
      problems.push("atomicRotate missing (session-fixation risk)");
    if (!capabilities.touch) problems.push("touch missing (idle expiry)");
  }
  if (store.rotate === undefined) problems.push("rotate() not implemented");
  if (store.touch === undefined) problems.push("touch() not implemented");

  if (problems.length > 0 && options.allowDegradedNonProduction !== true) {
    throw new SessionStoreError(
      "unavailable",
      `session store rejected for production posture: ${problems.join("; ")}` +
        " — pass allowDegradedNonProduction to run an explicitly degraded fixture",
    );
  }
}

const FORBIDDEN_DATA_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Serialization guard: session payloads persist as plain JSON-shaped data.
 * Anything outside the JSON value grammar — functions, symbols, undefined,
 * bigint, non-finite numbers, prototype-bearing keys, and circular
 * references — is REJECTED with the offending path rather than silently
 * dropped (silent drops corrupt round-trip expectations; cycles would
 * otherwise die as recursive RangeError instead of a typed diagnostic).
 */
export function assertSerializableSessionData(
  data: Record<string, unknown>,
): void {
  checkSerializableValue(data, "(root)", []);
}

function checkSerializableValue(
  value: unknown,
  path: string,
  parents: readonly object[],
): void {
  if (
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint" ||
    typeof value === "undefined"
  ) {
    throw new SessionStoreError(
      "serialization",
      `non-JSON ${String(typeof value)} value at ${path}`,
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new SessionStoreError(
      "serialization",
      `non-finite number (${value}) at ${path}`,
    );
  }
  if (value === null || typeof value !== "object") return;
  // Ancestor-path cycle detection: a reference to ANY enclosing container
  // is a cycle; shared (DAG) references to already-CLOSED containers are
  // legal JSON and stay accepted.
  if (parents.includes(value)) {
    throw new SessionStoreError(
      "serialization",
      `circular reference at ${path}`,
    );
  }
  const proto = Object.getPrototypeOf(value);
  if (
    proto !== Object.prototype &&
    proto !== Array.prototype &&
    !Array.isArray(value)
  ) {
    throw new SessionStoreError(
      "serialization",
      `prototype-bearing object at ${path}`,
    );
  }
  const childParents = [...parents, value];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_DATA_KEYS.has(key)) {
      throw new SessionStoreError(
        "serialization",
        `forbidden prototype-like key "${key}" at ${path}.${key}`,
      );
    }
    checkSerializableValue(child, `${path}.${key}`, childParents);
  }
  // Arrays may carry hostile containers too.
  if (Array.isArray(value)) {
    (value as unknown[]).forEach((child, index) =>
      checkSerializableValue(child, `${path}[${index}]`, childParents),
    );
  }
}

/**
 * In-memory store for tests and single-process demos. EXPLICITLY UNSUITABLE
 * FOR PRODUCTION: no persistence across restarts, no cross-process sharing,
 * and entries live until expiry sweep. Implements the FULL contract
 * including atomic rotate/touch so the conformance suite can run anywhere;
 * production requires a durable adapter passing the same suite.
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

  const clone = (record: SessionData): SessionData => ({
    ...record,
    data: { ...record.data },
  });

  return {
    capabilities: { durable: false, atomicRotate: true, touch: true },

    async load(id: string): Promise<SessionData | null> {
      const record = entries.get(id);
      if (record === undefined) return null;
      if (record.expiresAtMs <= Date.now()) {
        entries.delete(id);
        return null;
      }
      // Return a working copy: mutation without commit never leaks back.
      return clone(record);
    },
    async commit(record: SessionData): Promise<void> {
      assertSerializableSessionData(record.data);
      if (entries.size >= maxEntries) sweep(Date.now());
      if (entries.size >= maxEntries) {
        // Fail closed rather than grow without bound.
        throw new SessionStoreError(
          "unavailable",
          "memory session store exceeded maxEntries; use a durable store in production",
        );
      }
      entries.set(record.id, clone(record));
    },
    async destroy(id: string): Promise<void> {
      entries.delete(id);
    },
    async touch(id: string, expiresAtMs: number): Promise<boolean> {
      const record = entries.get(id);
      if (record === undefined || record.expiresAtMs <= Date.now()) {
        entries.delete(id);
        return false;
      }
      entries.set(id, { ...record, expiresAtMs });
      return true;
    },
    // Atomic within the event loop; CAS against concurrent consumption.
    async rotate(oldId: string, record: SessionData): Promise<void> {
      assertSerializableSessionData(record.data);
      if (!entries.has(oldId)) {
        throw new SessionStoreError(
          "conflict",
          `rotation lost: old session "${oldId}" already consumed`,
        );
      }
      entries.delete(oldId);
      entries.set(record.id, clone(record));
    },
  };
}
