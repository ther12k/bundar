/**
 * GH-062 session primitives: id lifecycle, store contract, and the
 * in-memory test store's expiry semantics.
 */
import { describe, expect, test } from "bun:test";
import {
  createMemorySessionStore,
  generateSessionId,
  isCanonicalSessionId,
} from "../../src/index";

describe("GH-062 session ids", () => {
  test("ids are canonical 43-char base64url values", () => {
    const id = generateSessionId();
    expect(id).toHaveLength(43);
    expect(isCanonicalSessionId(id)).toBe(true);
  });

  test("ids are unpredictable and unique", () => {
    const ids = new Set(
      Array.from({ length: 1_000 }, () => generateSessionId()),
    );
    expect(ids.size).toBe(1_000);
  });

  test("malformed cookie values are not canonical ids", () => {
    expect(isCanonicalSessionId(undefined)).toBe(false);
    expect(isCanonicalSessionId("")).toBe(false);
    expect(isCanonicalSessionId("short")).toBe(false);
    expect(isCanonicalSessionId("not base64url !!! plus spaces")).toBe(false);
    expect(isCanonicalSessionId(`${"a".repeat(42)}+`)).toBe(false);
  });
});

describe("GH-062 memory store contract", () => {
  test("commit then load round-trips data", async () => {
    const store = createMemorySessionStore();
    const id = generateSessionId();
    await store.commit({
      id,
      data: { user: "bundar", count: 3 },
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
    });
    const loaded = await store.load(id);
    expect(loaded?.data.user).toBe("bundar");
    expect(loaded?.data.count).toBe(3);
  });

  test("load returns copies — mutation never leaks back", async () => {
    const store = createMemorySessionStore();
    const id = generateSessionId();
    await store.commit({
      id,
      data: { user: "bundar" },
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
    });
    const first = await store.load(id);
    first!.data.user = "tampered";
    const second = await store.load(id);
    expect(second?.data.user).toBe("bundar");
  });

  test("expired records return null and are removed", async () => {
    const store = createMemorySessionStore();
    const id = generateSessionId();
    await store.commit({
      id,
      data: {},
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 5,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await store.load(id)).toBeNull();
  });

  test("destroy makes an id permanently unloadable", async () => {
    const store = createMemorySessionStore();
    const id = generateSessionId();
    await store.commit({
      id,
      data: { user: "x" },
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
    });
    await store.destroy(id);
    expect(await store.load(id)).toBeNull();
  });

  test("unknown ids load as null", async () => {
    const store = createMemorySessionStore();
    expect(await store.load(generateSessionId())).toBeNull();
  });
});
