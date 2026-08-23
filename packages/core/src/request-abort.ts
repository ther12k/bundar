/**
 * Per-request cancellation scope (BR-058).
 *
 * Composes ONE standard AbortSignal per request from up to three sources:
 * transport disconnect (Request.signal), a request-budget deadline, and
 * forced server shutdown. Application code consumes `context.signal` —
 * a plain web-standard AbortSignal with no Bun-specific types.
 *
 * Guarantees (contract, tested):
 * - FIRST CAUSE WINS: a later deadline never overwrites an earlier client
 *   disconnect; the reason records whichever source aborted first.
 * - Every listener and timer is released exactly once.
 * - The composer is instantiated per request. No module-level controllers,
 *   dispatch cursors, mutable reasons, or cleanup flags exist here.
 * - Separate Bundar application instances cannot cancel each other.
 * - An already-aborted source yields an immediately-aborted composite.
 * - Cleanup (`dispose`) is safe before and after abort and idempotent.
 */

export type RequestAbortKind =
  "client_disconnect" | "request_deadline" | "forced_shutdown";

/**
 * Internal normalized attribution. BR-067 owns any future public
 * error-code surface; this type stays internal until then.
 */
export interface RequestAbortReason {
  readonly kind: RequestAbortKind;
  readonly cause?: unknown;
}

export interface RequestAbortScope {
  /** The composite signal application code observes. */
  readonly signal: AbortSignal;
  /** Normalized first-cause reason once aborted; null before. */
  reason(): RequestAbortReason | null;
  /**
   * Releases listeners and timers exactly once. Idempotent and safe to
   * call before or after abort. After dispose, late source aborts no
   * longer reach the composite signal (cleanup semantics, not an error).
   */
  dispose(): void;
}

export interface AbortSourceSpec {
  /** Transport disconnect: the incoming request's own signal. */
  readonly transport?: AbortSignal | null;
  /** Request-budget deadline in milliseconds (GH-067 budget integration). */
  readonly deadlineMs?: number | null;
  /** Forced-shutdown signal from the application lifecycle. */
  readonly forcedShutdown?: AbortSignal | null;
}

const KIND_BY_SOURCE = {
  transport: "client_disconnect",
  deadlineMs: "request_deadline",
  forcedShutdown: "forced_shutdown",
} as const;

export function createRequestAbortScope(
  sources: AbortSourceSpec,
): RequestAbortScope {
  const controller = new AbortController();
  let settledReason: RequestAbortReason | null = null;
  let disposed = false;

  const cleanupFns: (() => void)[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];

  const settle = (reason: RequestAbortReason): void => {
    // First cause wins: later sources are ignored after the first abort.
    if (settledReason !== null || controller.signal.aborted) {
      return;
    }
    settledReason = reason;
    controller.abort(reason.cause);
    dispose();
  };

  const listen = (
    key: keyof typeof KIND_BY_SOURCE,
    signal: AbortSignal | null | undefined,
  ): void => {
    if (signal === null || signal === undefined) return;
    const kind = KIND_BY_SOURCE[key];
    const onAbort = () => settle({ kind, cause: signal.reason });
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    cleanupFns.push(() => signal.removeEventListener("abort", onAbort));
  };

  listen("transport", sources.transport);
  listen("forcedShutdown", sources.forcedShutdown);

  if (
    typeof sources.deadlineMs === "number" &&
    sources.deadlineMs > 0 &&
    !controller.signal.aborted
  ) {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      settle({
        kind: "request_deadline",
        cause: new Error(`request deadline exceeded (${sources.deadlineMs}ms)`),
      });
    }, sources.deadlineMs);
    timers.push(timer);
  }

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
    for (const timer of timers) clearTimeout(timer);
    timers.length = 0;
  }

  // Settle() calls dispose() internally; expose an idempotent public form.
  return { signal: controller.signal, reason: () => settledReason, dispose };
}
