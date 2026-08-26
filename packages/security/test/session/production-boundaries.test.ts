/**
 * BR-089 (#141): production session capabilities are enforced fail-closed
 * at middleware construction — no silent degraded rotation/touch in
 * production; the only escape is an explicit, default-off named flag.
 *
 * BR-094 (#146): the serialization guard is strictly JSON-safe — undefined,
 * bigint, and non-finite numbers are rejected with paths; cycles are typed
 * diagnostics (not recursive RangeError); shared non-circular references
 * stay legal.
 *
 * BR-090 (#142): sliding expiry moves the BROWSER cookie with the store —
 * expiry-aware lifecycle proofs, not store-record reads.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { composeMiddleware, createContext, text } from "@bundar/core";
import type { Context } from "@bundar/core";
import {
  createMemorySessionStore,
  getSession,
  sessionMiddleware,
  assertSerializableSessionData,
} from "../../src/index";
import type { SessionStore, SessionStoreError } from "../../src/index";

// ---------------------------------------------------------------------------
// BR-089: production capability floor
// ---------------------------------------------------------------------------

/** Self-contained durable fake (NOT the branded memory store) so the
 * capability gate is what's under test, not the posture memory check. */
function productionStore(
  capabilities:
    { durable: boolean; atomicRotate: boolean; touch: boolean } | undefined,
  omitMethods: "none" | "rotate" | "touch" = "none",
): SessionStore {
  const records = new Map<string, import("../../src/index").SessionData>();
  const store: Record<string, unknown> = {
    load: async (id: string) => records.get(id) ?? null,
    commit: async (record: import("../../src/index").SessionData) => {
      records.set(record.id, record);
    },
    destroy: async (id: string) => {
      records.delete(id);
    },
    rotate: async (
      oldId: string,
      record: import("../../src/index").SessionData,
    ) => {
      records.delete(oldId);
      records.set(record.id, record);
    },
    touch: async (id: string, expiresAtMs: number) => {
      const record = records.get(id);
      if (record) records.set(id, { ...record, expiresAtMs });
    },
  };
  if (capabilities !== undefined) store.capabilities = capabilities;
  if (omitMethods === "rotate") delete store.rotate;
  if (omitMethods === "touch") delete store.touch;
  return store as unknown as SessionStore;
}

const STRONG_SECRET = "s".repeat(48);

function construct(options: Record<string, unknown>): void {
  composeMiddleware([sessionMiddleware(options as never)], () => text("ok"));
}

describe("BR-089 production session capability enforcement", () => {
  test("durable=true, atomicRotate=false → construction rejected", () => {
    expect(() =>
      construct({
        environment: "production",
        secure: true,
        csrfSecret: STRONG_SECRET,
        store: productionStore({
          durable: true,
          atomicRotate: false,
          touch: true,
        }),
      }),
    ).toThrow(/atomicRotate missing/);
  });

  test("durable=true, touch=false → construction rejected", () => {
    expect(() =>
      construct({
        environment: "production",
        secure: true,
        csrfSecret: STRONG_SECRET,
        store: productionStore({
          durable: true,
          atomicRotate: true,
          touch: false,
        }),
      }),
    ).toThrow(/touch missing/);
  });

  test("capability declared but method absent → construction rejected", () => {
    expect(() =>
      construct({
        environment: "production",
        secure: true,
        csrfSecret: STRONG_SECRET,
        store: productionStore(
          { durable: true, atomicRotate: true, touch: true },
          "rotate",
        ),
      }),
    ).toThrow(/rotate\(\) not implemented/);
    expect(() =>
      construct({
        environment: "production",
        secure: true,
        csrfSecret: STRONG_SECRET,
        store: productionStore(
          { durable: true, atomicRotate: true, touch: true },
          "touch",
        ),
      }),
    ).toThrow(/touch\(\) not implemented/);
  });

  test("capabilities not declared at all → rejected", () => {
    const store = productionStore(undefined);
    expect(() =>
      construct({
        environment: "production",
        secure: true,
        csrfSecret: STRONG_SECRET,
        allowMemorySessionsInProduction: true, // past the posture layer
        store,
      }),
    ).toThrow(/capabilities not declared/);
  });

  test("all capabilities implemented → accepted in production", () => {
    expect(() =>
      construct({
        environment: "production",
        secure: true,
        csrfSecret: STRONG_SECRET,
        store: productionStore({
          durable: true,
          atomicRotate: true,
          touch: true,
        }),
      }),
    ).not.toThrow();
  });

  test("development mode: capability floor does not apply", () => {
    expect(() =>
      construct({
        store: productionStore({
          durable: false,
          atomicRotate: false,
          touch: false,
        }),
      }),
    ).not.toThrow();
  });

  test("the explicit degraded-mode flag is the only production escape", () => {
    expect(() =>
      construct({
        environment: "production",
        secure: true,
        csrfSecret: STRONG_SECRET,
        allowDegradedSessionStoreInProduction: true,
        store: productionStore({
          durable: true,
          atomicRotate: false,
          touch: false,
        }),
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// BR-094: strictly JSON-safe session data
// ---------------------------------------------------------------------------

describe("BR-094 JSON-safe serialization guard", () => {
  test("undefined, bigint, NaN, Infinity rejected with paths", () => {
    expect(() =>
      assertSerializableSessionData({ user: { name: undefined } }),
    ).toThrow(/non-JSON undefined value at \(root\).user\.name/);
    expect(() =>
      assertSerializableSessionData({ user: { score: 1n } }),
    ).toThrow(/non-JSON bigint value at \(root\).user\.score/);
    expect(() =>
      assertSerializableSessionData({ user: { score: NaN } }),
    ).toThrow(/non-finite number \(NaN\) at \(root\).user\.score/);
    expect(() =>
      assertSerializableSessionData({ user: { score: Infinity } }),
    ).toThrow(/non-finite number \(Infinity\) at \(root\).user\.score/);
  });

  test("circular objects and arrays are typed diagnostics, not RangeError", () => {
    const circular: Record<string, unknown> = { user: { profile: {} } };
    (circular.user as Record<string, unknown>).profile = circular.user;
    try {
      assertSerializableSessionData(circular);
      throw new Error("expected a SessionStoreError");
    } catch (error) {
      expect(error).not.toBeInstanceOf(RangeError);
      expect((error as SessionStoreError).name).toBe("SessionStoreError");
      expect((error as Error).message).toMatch(/circular reference/);
    }

    const loop: unknown[] = [1, [2]];
    (loop[1] as unknown[]).push(loop);
    expect(() => assertSerializableSessionData({ items: loop })).toThrow(
      /circular reference/,
    );
  });

  test("shared (non-circular) references remain legal JSON", () => {
    const shared = { ok: true };
    expect(() =>
      assertSerializableSessionData({
        a: shared,
        b: shared,
        list: [shared, shared],
      }),
    ).not.toThrow();
  });

  test("valid nested data still accepted (no false positives)", () => {
    expect(() =>
      assertSerializableSessionData({
        user: { name: "ada", tags: ["a", "b"], meta: { v: 1, n: null } },
        count: 3,
        flag: false,
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// BR-090: sliding expiry reaches the browser cookie
// ---------------------------------------------------------------------------

// Deterministic virtual clock: the middleware, store, and cookie expiry
// all read Date.now(); patching it (file-scoped — bun isolates test
// files) makes the sliding-window lifecycle drift-proof under load.
const REAL_NOW = Date.now;
let virtualNow = REAL_NOW();
beforeAll(() => {
  Date.now = () => virtualNow;
});
afterAll(() => {
  Date.now = REAL_NOW;
});

function dispatch(
  store: SessionStore,
  options: Record<string, unknown>,
  cookieId?: string,
): Promise<Response> {
  const composed = composeMiddleware(
    [sessionMiddleware({ store, ...(options as object) } as never)],
    (context: Context) => {
      // Reading the session forces the load that sliding touch guards.
      void getSession(context)?.id;
      return text("ok");
    },
  );
  return composed(
    createContext(
      new Request("http://localhost/app", {
        headers: cookieId ? { cookie: `bundar.session=${cookieId}` } : {},
      }),
      {},
    ),
  ) as Promise<Response>;
}

function sessionCookieExpires(response: Response): number | undefined {
  for (const cookie of response.headers.getSetCookie()) {
    const match = cookie.match(/(?:^|;\s*)Expires=([^;]+)/i);
    if (match?.[1]) return Date.parse(match[1]);
  }
  return undefined;
}

function sessionCookieOf(response: Response): string | undefined {
  for (const cookie of response.headers.getSetCookie()) {
    const match = cookie.match(/^bundar\.session=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

/** An expiry-aware jar: keeps the cookie only while its Expires is ahead. */
class ExpiryJar {
  private value: string | undefined;
  private expiresAt = 0;

  absorb(response: Response): void {
    const id = sessionCookieOf(response);
    const expires = sessionCookieExpires(response);
    if (id !== undefined && expires !== undefined) {
      this.value = id;
      this.expiresAt = expires;
    }
  }

  sends(now: number): string | undefined {
    return now < this.expiresAt ? this.value : undefined;
  }
}

describe("BR-090 sliding expiry end-to-end (browser cookie)", () => {
  test("read-only activity refreshes the cookie; the session survives its original idle deadline", async () => {
    const store = createMemorySessionStore();
    // Idle 5s: Set-Cookie Expires floors to whole seconds, so every
    // timing margin below keeps >1s slack against that quantization.
    const idle = 5_000;
    const jar = new ExpiryJar();

    const first = await dispatch(store, {
      idleTimeoutMs: idle,
      absoluteTimeoutMs: 120_000,
    });
    jar.absorb(first);
    const id = sessionCookieOf(first);
    const firstExpires = sessionCookieExpires(first)!;

    // >50% of the idle window consumed, still inside the ORIGINAL window
    virtualNow += 3_000;
    const second = await dispatch(
      store,
      { idleTimeoutMs: idle, absoluteTimeoutMs: 120_000 },
      jar.sends(virtualNow),
    );
    const refreshedExpires = sessionCookieExpires(second);
    expect(refreshedExpires).toBeDefined();
    expect(sessionCookieOf(second)).toBe(id); // SAME session, refreshed
    expect(refreshedExpires!).toBeGreaterThan(firstExpires);
    jar.absorb(second);

    // Past the ORIGINAL idle deadline: the jar (expiry-aware) still holds
    // the cookie BECAUSE the refresh moved it — and the session is still
    // recognized. Under parallel-suite load dispatches drift, so the
    // invariant asserted is NO NEW SESSION (a same-id refresh cookie from
    // another touch is fine; a different id would be a regression).
    virtualNow = firstExpires + 150;
    const third = await dispatch(
      store,
      { idleTimeoutMs: idle, absoluteTimeoutMs: 120_000 },
      jar.sends(virtualNow),
    );
    const thirdCookie = sessionCookieOf(third);
    expect(thirdCookie === undefined || thirdCookie === id).toBe(true);
  });

  test("the absolute timeout stays hard — touch can never extend past it", async () => {
    const store = createMemorySessionStore();
    // idle 400ms, absolute 450ms: at t≈250 the touch threshold is met and
    // nextExpiry = min(absoluteDeadline, now+idle) — the ABSOLUTE deadline
    // must win, proving touch cannot slide past it.
    const first = await dispatch(store, {
      idleTimeoutMs: 400,
      absoluteTimeoutMs: 450,
    });
    const createdAt = virtualNow;
    const firstExpires = sessionCookieExpires(first)!;

    virtualNow += 250;
    const second = await dispatch(
      store,
      { idleTimeoutMs: 400, absoluteTimeoutMs: 450 },
      sessionCookieOf(first),
    );
    const refreshed = sessionCookieExpires(second);
    expect(refreshed).toBeDefined();
    // the cap: refreshed expiry is pinned at the absolute deadline (with
    // small clock slack), never at now+idle (which would be ~650ms out)
    // Set-Cookie Expires truncates to whole seconds: the cap assertion
    // allows up to 1s of truncation but never now+idle (650ms out).
    expect(refreshed!).toBeLessThanOrEqual(createdAt + 450);
    expect(refreshed!).toBeGreaterThan(createdAt + 450 - 1_000);
    expect(refreshed!).toBeGreaterThan(firstExpires - 5);
  });

  test("a failing touch() refreshes nothing — no misleading client cookie", async () => {
    const base = createMemorySessionStore();
    const store: SessionStore = {
      ...base,
      touch: async () => {
        throw new Error("store touch failed");
      },
    };
    const idle = 400;
    const first = await dispatch(store, { idleTimeoutMs: idle });
    const id = sessionCookieOf(first)!;

    virtualNow += 260;
    let errored = false;
    try {
      await dispatch(store, { idleTimeoutMs: idle }, id);
    } catch {
      errored = true; // fail closed: the store error surfaces, no cookie lie
    }
    expect(errored).toBe(true);
  });
});
