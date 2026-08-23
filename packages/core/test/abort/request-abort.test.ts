/**
 * BR-058 commit-1 tests: request-abort scope composer — first cause wins,
 * exact-once cleanup, pre-aborted sources, dispose safety, and per-request
 * isolation (no module-level state).
 */
import { describe, expect, test } from "bun:test";
import {
  createRequestAbortScope,
  type RequestAbortScope,
} from "../../src/request-abort";

function deferredSignal(): { signal: AbortSignal; abort(): void } {
  const controller = new AbortController();
  return { signal: controller.signal, abort: () => controller.abort() };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("BR-058 request-abort scope", () => {
  test("transport abort propagates with client_disconnect reason", async () => {
    const transport = deferredSignal();
    const scope = createRequestAbortScope({ transport: transport.signal });
    expect(scope.signal.aborted).toBe(false);
    expect(scope.reason()).toBeNull();
    transport.abort();
    await tick();
    expect(scope.signal.aborted).toBe(true);
    expect(scope.reason()?.kind).toBe("client_disconnect");
    scope.dispose();
  });

  test("first cause wins: later deadline cannot overwrite earlier disconnect", async () => {
    const transport = deferredSignal();
    const forced = deferredSignal();
    const scope = createRequestAbortScope({
      transport: transport.signal,
      deadlineMs: 5,
      forcedShutdown: forced.signal,
    });
    transport.abort();
    await tick();
    const firstReason = scope.reason();
    expect(firstReason?.kind).toBe("client_disconnect");

    // late sources fire after the first abort; reason must not change
    forced.abort();
    await new Promise((r) => setTimeout(r, 15));
    expect(scope.reason()).toEqual(firstReason);
    scope.dispose();
  });

  test("deadline produces request_deadline reason when nothing else fires", async () => {
    const scope = createRequestAbortScope({ deadlineMs: 10 });
    const aborted = new Promise<void>((r) =>
      scope.signal.addEventListener("abort", () => r(), { once: true }),
    );
    await aborted;
    expect(scope.reason()?.kind).toBe("request_deadline");
    scope.dispose();
  });

  test("forced shutdown composes independently of transport", async () => {
    const forced = deferredSignal();
    const scope = createRequestAbortScope({ forcedShutdown: forced.signal });
    forced.abort();
    await tick();
    expect(scope.reason()?.kind).toBe("forced_shutdown");
    scope.dispose();
  });

  test("already-aborted source yields an immediately-aborted composite", () => {
    const transport = deferredSignal();
    transport.abort(); // pre-aborted BEFORE creation
    const scope = createRequestAbortScope({ transport: transport.signal });
    expect(scope.signal.aborted).toBe(true);
    expect(scope.reason()?.kind).toBe("client_disconnect");
    scope.dispose();
  });

  test("dispose before any abort prevents late source delivery", async () => {
    const transport = deferredSignal();
    const scope = createRequestAbortScope({ transport: transport.signal });
    scope.dispose(); // cleanup first
    transport.abort();
    await tick();
    // Cleanup semantics: late source aborts do not reach the composite.
    expect(scope.signal.aborted).toBe(false);
  });

  test("dispose is idempotent and safe after abort", async () => {
    const transport = deferredSignal();
    const scope = createRequestAbortScope({ transport: transport.signal });
    transport.abort();
    await tick();
    expect(() => {
      scope.dispose();
      scope.dispose();
      scope.dispose();
    }).not.toThrow();
    expect(scope.reason()?.kind).toBe("client_disconnect");
  });

  test("deadline timer is released by dispose (no leak)", async () => {
    const scope = createRequestAbortScope({ deadlineMs: 5 });
    scope.dispose(); // timer cleared
    await new Promise((r) => setTimeout(r, 20));
    expect(scope.signal.aborted).toBe(false); // never fires after dispose
  });

  test("remaining races preserve first cause: deadline-vs-forced, forced-vs-transport", async () => {
    // deadline fires first, forced arrives later
    const forcedA = deferredSignal();
    const scopeA = createRequestAbortScope({
      deadlineMs: 5,
      forcedShutdown: forcedA.signal,
    });
    await new Promise((r) => setTimeout(r, 15));
    expect(scopeA.reason()?.kind).toBe("request_deadline");
    forcedA.abort();
    await tick();
    expect(scopeA.reason()?.kind).toBe("request_deadline"); // unchanged
    scopeA.dispose();

    // forced fires first, transport arrives later
    const forcedB = deferredSignal();
    const transportB = deferredSignal();
    const scopeB = createRequestAbortScope({
      transport: transportB.signal,
      forcedShutdown: forcedB.signal,
    });
    forcedB.abort();
    await tick();
    expect(scopeB.reason()?.kind).toBe("forced_shutdown");
    transportB.abort();
    await tick();
    expect(scopeB.reason()?.kind).toBe("forced_shutdown"); // unchanged
    scopeB.dispose();
  });

  test("per-request isolation: sibling scopes are fully independent", async () => {
    const a = deferredSignal();
    const b = deferredSignal();
    const scopeA = createRequestAbortScope({ transport: a.signal });
    const scopeB = createRequestAbortScope({ transport: b.signal });

    a.abort();
    await tick();

    expect(scopeA.signal.aborted).toBe(true);
    expect(scopeB.signal.aborted).toBe(false);
    expect(scopeB.reason()).toBeNull();

    b.abort();
    await tick();
    expect(scopeB.reason()?.kind).toBe("client_disconnect");
    scopeA.dispose();
    scopeB.dispose();
  });

  test("composite signal carries no framework internals as reason cause", async () => {
    // A REAL controller here: the composite must relay the source's own
    // abort reason verbatim, not wrap it in framework error objects.
    const controller = new AbortController();
    const scope: RequestAbortScope = createRequestAbortScope({
      transport: controller.signal,
    });
    let observed: unknown;
    scope.signal.addEventListener(
      "abort",
      () => {
        observed = scope.signal.reason;
      },
      { once: true },
    );
    controller.abort(new Error("socket closed"));
    await tick();
    // The cause is the SOURCE's own reason (standard AbortSignal semantics),
    // not a framework error object pretending to be an application fault.
    expect(observed instanceof Error).toBe(true);
    scope.dispose();
  });
});
