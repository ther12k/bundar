/**
 * BR-057 lifecycle tests: ordering, rollback, readiness, bounded drain,
 * idempotent stop, and the signal test seam.
 */
import { describe, expect, test } from "bun:test";
import { Lifecycle, LifecycleStartError } from "../../src/lifecycle";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("BR-057 application lifecycle", () => {
  test("resources start in order and become ready only at the end", async () => {
    const lifecycle = new Lifecycle();
    const order: string[] = [];
    lifecycle.register({
      name: "db",
      start: () => void order.push("db"),
    });
    lifecycle.register({
      name: "cache",
      start: () => void order.push("cache"),
    });
    expect(lifecycle.ready).toBe(false);
    await lifecycle.start();
    expect(order).toEqual(["db", "cache"]);
    expect(lifecycle.ready).toBe(true);
  });

  test("startup failure stops earlier resources in reverse order", async () => {
    const stopped: string[] = [];
    const lifecycle = new Lifecycle();
    lifecycle.register({
      name: "a",
      start: () => undefined,
      stop: () => void stopped.push("a"),
    });
    lifecycle.register({
      name: "b",
      start: () => undefined,
      stop: () => void stopped.push("b"),
    });
    lifecycle.register({
      name: "boom",
      start: () => {
        throw new Error("no database");
      },
    });

    await expect(lifecycle.start()).rejects.toBeInstanceOf(LifecycleStartError);
    expect(stopped).toEqual(["b", "a"]);
    expect(lifecycle.ready).toBe(false);
  });

  test("drain waits bounded for in-flight work, then aborts remainder", async () => {
    const aborted: boolean[] = [];
    const never = deferred();
    const lifecycle = new Lifecycle({
      shutdownDeadlineMs: 20,
      hooks: {
        beginDrain: () => undefined,
        abortRemaining: () => void aborted.push(true),
      },
    });
    lifecycle.register({ name: "app" });
    await lifecycle.start();

    const release = lifecycle.beginWork();
    let drained = false;
    const draining = lifecycle.drain().then(() => (drained = true));

    // still within deadline: not finished
    await new Promise((r) => setTimeout(r, 5));
    expect(drained).toBe(false);

    never.resolve();
    release();
    await draining;
    expect(drained).toBe(true);
    expect(aborted).toEqual([]);
    await lifecycle.stop();
  });

  test("deadline expiry aborts remaining in-flight work deterministically", async () => {
    const aborted: number[] = [];
    const lifecycle = new Lifecycle({
      shutdownDeadlineMs: 15,
      hooks: { abortRemaining: () => void aborted.push(1) },
    });
    await lifecycle.start();
    lifecycle.beginWork(); // never released
    await lifecycle.drain();
    expect(aborted).toEqual([1]);
    await lifecycle.stop();
    expect(lifecycle.state).toBe("stopped");
  });

  test("repeated stop calls are idempotent with deterministic cleanup order", async () => {
    const cleanup: string[] = [];
    const lifecycle = new Lifecycle();
    lifecycle.register({ name: "a", stop: () => void cleanup.push("a") });
    lifecycle.register({ name: "b", stop: () => void cleanup.push("b") });
    await lifecycle.start();
    await lifecycle.stop();
    await lifecycle.stop();
    await lifecycle.stop();
    expect(cleanup).toEqual(["b", "a"]);
    expect(lifecycle.state).toBe("stopped");
  });

  test("stop on an idle lifecycle is a no-op that still marks stopped", async () => {
    const lifecycle = new Lifecycle();
    await lifecycle.stop();
    expect(lifecycle.state).toBe("stopped");
    expect(lifecycle.ready).toBe(false);
  });

  test("signal registrar seam invokes stop without real signals", async () => {
    let captured: ((signal: string) => void) | null = null;
    const unregisterCalls: number[] = [];
    const lifecycle = new Lifecycle({
      registerSignals: (handler) => {
        captured = handler;
        return () => unregisterCalls.push(1);
      },
    });
    await lifecycle.start();
    const off = lifecycle.attachSignals();
    expect(captured).not.toBeNull();
    captured?.("SIGTERM");
    // stop is async; wait a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(lifecycle.state).toBe("stopped");
    off();
    expect(unregisterCalls).toEqual([1]);
  });

  test("registration after start is rejected", async () => {
    const lifecycle = new Lifecycle();
    await lifecycle.start();
    expect(() => lifecycle.register({ name: "late" })).toThrow(
      /after lifecycle start/,
    );
  });
});
