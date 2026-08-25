/**
 * BR-063 review fix: sliding idle timeout for READ-ONLY requests.
 * Fake-clock style via direct store manipulation (no real sleeping).
 */
import { describe, expect, test } from "bun:test";
import type { Context } from "@bundar/core";
import { createMemorySessionStore } from "../../src/session/store";
import { generateSessionId } from "../../src/session/id";
import { sessionMiddleware } from "../../src/session/middleware";

const IDLE = 10 * 60 * 1000; // 10 minutes
const ABSOLUTE = 60 * 60 * 1000; // 1 hour

function ctxWith(cookie?: string, signal = new AbortController().signal): Context {
  return {
    request: new Request("http://t/read", {
      headers: cookie ? { cookie: `bundar.session=${cookie}` } : {},
    }),
    params: {},
    state: {},
    signal,
  } as unknown as Context;
}

async function readOnlyRequest(store: ReturnType<typeof createMemorySessionStore>, cookie: string) {
  const middleware = sessionMiddleware({
    store,
    secure: false,
    idleTimeoutMs: IDLE,
    absoluteTimeoutMs: ABSOLUTE,
  });
  const context = ctxWith(cookie);
  const response = await middleware(context, async () => new Response("ok"));
  return response as Response;
}

describe("BR-062 review: sliding idle timeout", () => {
  test("read-only request inside >50% consumed window extends expiry via touch", async () => {
    const store = createMemorySessionStore();
    const id = generateSessionId();
    const created = Date.now() - 6 * 60 * 1000; // 6 min old
    await store.commit({
      id,
      data: { role: "user" },
      createdAtMs: created,
      expiresAtMs: created + IDLE, // only 4 min remaining (<50% of window)
    });

    const response = await readOnlyRequest(store, id);
    expect(response.status).toBe(200);

    const after = await store.load(id)!;
    expect(after).not.toBeNull();
    // extended to now+idle (~10min), still under absolute ceiling
    expect(after!.expiresAtMs).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
  });

  test("read-only request with plenty of TTL does NOT touch (throttle)", async () => {
    const store = createMemorySessionStore();
    const id = generateSessionId();
    const expiresAtMs = Date.now() + 9 * 60 * 1000; // 90% remaining
    await store.commit({
      id,
      data: {},
      createdAtMs: Date.now(),
      expiresAtMs,
    });

    await readOnlyRequest(store, id);
    const after = await store.load(id)!;
    expect(after!.expiresAtMs).toBe(expiresAtMs); // untouched
  });

  test("sliding never extends past the ABSOLUTE deadline", async () => {
    const store = createMemorySessionStore();
    const id = generateSessionId();
    const createdAtMs = Date.now() - 55 * 60 * 1000; // 55 min old session
    await store.commit({
      id,
      data: { role: "admin" },
      createdAtMs,
      expiresAtMs: createdAtMs + ABSOLUTE, // dies in 5 min regardless
    });

    await readOnlyRequest(store, id);
    const after = await store.load(id)!;
    // nextExpiry clamped to absoluteDeadline (createdAt+ABSOLUTE)
    expect(after!.expiresAtMs).toBeLessThanOrEqual(createdAtMs + ABSOLUTE);
  });

  test("session past the absolute deadline stays dead even with activity", async () => {
    const store = createMemorySessionStore();
    const deadId = generateSessionId();
    const longAgo = Date.now() - 2 * ABSOLUTE;
    await store.commit({
      id: deadId,
      data: { role: "admin" },
      createdAtMs: longAgo,
      expiresAtMs: longAgo + ABSOLUTE, // already expired absolutely
    });

    const response = await readOnlyRequest(store, deadId);
    expect(response.status).toBe(200); // fresh anonymous session served

    // the DEAD id must remain unloadable — activity cannot resurrect it
    expect(await store.load(deadId)).toBeNull();
      });
});
