/**
 * Request budgets, timeouts, and abort propagation (GH-067).
 *
 * A request budget is a per-request execution allowance: a handler deadline,
 * capped body limits, and one composite AbortSignal that fires on the FIRST
 * of client disconnect, deadline expiry, or server shutdown. Middleware
 * races the downstream chain against the deadline and disposes cleanly when
 * the response settles; handlers read the signal through `getRequestBudget`
 * and pass it into parsers, renderers, and their own awaits so cancellation
 * propagates instead of burning the deadline in the background.
 *
 * Overrides are validated at composition time (startup) against frozen
 * server maximums — a route may tighten a budget, never exceed it.
 */
import type { Context } from "./context";
import { HttpError, isAbortLike } from "./errors";
import type { Middleware } from "./middleware";
import {
  BodyLimitError,
  DEFAULT_BODY_LIMITS,
  type BodyLimits,
} from "./request/body";

/** Ceiling for every per-route budget override. Frozen at startup. */
export interface BudgetMaximums {
  /** Total handler execution budget per request. */
  readonly requestTimeoutMs: number;
  /** Body read budget cap (parseForm/parseJson/parseText `timeoutMs`). */
  readonly bodyTimeoutMs: number;
  /** Body size cap (parse* `maxBytes`). */
  readonly maxBytes: number;
}

/** Documented defaults; callers may tighten, never loosen silently. */
export const DEFAULT_BUDGET_MAXIMUMS: BudgetMaximums = Object.freeze({
  requestTimeoutMs: 30_000,
  bodyTimeoutMs: 10_000,
  maxBytes: 1_048_576,
});

/** Startup-time validation failure — fail closed before any request runs. */
export class BudgetPolicyError extends Error {
  public constructor(detail: string) {
    super(`budget policy violation: ${detail}`);
    this.name = "BudgetPolicyError";
  }
}

/** Handler deadline exhausted — public 503 envelope with Retry-After. */
export class RequestTimeoutError extends HttpError {
  public constructor(timeoutMs: number, cause?: unknown) {
    super("service_unavailable", "request budget exceeded", {
      headers: { "retry-after": "1" },
      details: { timeoutMs },
      cause,
    });
    this.name = "RequestTimeoutError";
  }
}

/** Per-route budget overrides; each is capped by the server maximums. */
export interface BudgetOverrides {
  readonly requestTimeoutMs?: number;
  readonly bodyLimits?: Partial<BodyLimits>;
}

/** Effective, validated limits for one route/group. */
export interface EffectiveBudget {
  readonly requestTimeoutMs: number;
  readonly bodyLimits: Readonly<BodyLimits>;
}

function assertAtMost(label: string, value: number, maximum: number): void {
  if (!Number.isFinite(value) || value < 1) {
    throw new BudgetPolicyError(`${label} must be a positive number`);
  }
  if (value > maximum) {
    throw new BudgetPolicyError(
      `${label} ${value} exceeds the server maximum ${maximum}`,
    );
  }
}

/**
 * Validates overrides against the maximums at composition time and returns
 * the frozen effective budget. Fail closed: an invalid or excessive override
 * throws BudgetPolicyError before the server accepts traffic.
 */
export function resolveBudget(
  overrides: BudgetOverrides = {},
  maximums: BudgetMaximums = DEFAULT_BUDGET_MAXIMUMS,
): EffectiveBudget {
  const requestTimeoutMs =
    overrides.requestTimeoutMs ?? maximums.requestTimeoutMs;
  assertAtMost("requestTimeoutMs", requestTimeoutMs, maximums.requestTimeoutMs);

  // Defaults themselves must respect the maximums: a server configured with
  // tighter maximums never silently keeps the wider document defaults.
  const requested: BodyLimits = {
    ...DEFAULT_BODY_LIMITS,
    timeoutMs: Math.min(DEFAULT_BODY_LIMITS.timeoutMs, maximums.bodyTimeoutMs),
    maxBytes: Math.min(DEFAULT_BODY_LIMITS.maxBytes, maximums.maxBytes),
    ...overrides.bodyLimits,
  };
  assertAtMost(
    "bodyLimits.timeoutMs",
    requested.timeoutMs,
    maximums.bodyTimeoutMs,
  );
  assertAtMost("bodyLimits.maxBytes", requested.maxBytes, maximums.maxBytes);
  // Non-capped body limits still must be sane positive numbers.
  assertAtMost(
    "bodyLimits.maxFields",
    requested.maxFields,
    Number.MAX_SAFE_INTEGER,
  );
  assertAtMost(
    "bodyLimits.maxFiles",
    requested.maxFiles,
    Number.MAX_SAFE_INTEGER,
  );
  assertAtMost(
    "bodyLimits.maxNestingDepth",
    requested.maxNestingDepth,
    Number.MAX_SAFE_INTEGER,
  );

  return Object.freeze({
    requestTimeoutMs,
    bodyLimits: Object.freeze({ ...requested }),
  });
}

/** Why a request stopped. Derived from the budget's abort source, not from
 * the error shape alone — the same AbortError means different things
 * depending on who fired the signal. */
export type RequestOutcomeKind =
  | "completed"
  | "client-disconnect"
  | "request-timeout"
  | "body-limit"
  | "server-shutdown"
  | "expected-failure"
  | "unexpected-failure";

export type RequestOutcome = {
  readonly kind: RequestOutcomeKind;
  readonly detail?: string;
};

/** Which source aborted the composite signal first. */
export type BudgetAbortSource = "client" | "deadline" | "shutdown";

/**
 * Per-request budget: composite signal, deadline bookkeeping, capped body
 * limits, and verifiable cleanup. Immutable except for disposal state.
 */
export interface RequestBudget {
  /** Fires on the first of client disconnect, deadline, or shutdown. */
  readonly signal: AbortSignal;
  readonly requestTimeoutMs: number;
  /** Effective body limits for parse* calls on this request. */
  readonly bodyLimits: Readonly<BodyLimits>;
  /** Milliseconds left before the deadline; 0 once elapsed. */
  remainingMs(): number;
  /** Which source aborted the signal, once it has aborted. */
  abortedBy(): BudgetAbortSource | null;
  /** True after dispose(): timers cleared, source listeners removed. */
  readonly disposed: boolean;
  /** Source listeners still attached (cleanup evidence; 0 after dispose). */
  readonly attachedSources: number;
}

export interface CreateRequestBudgetOptions {
  /** Server shutdown source; aborting it classifies outcomes as shutdown. */
  readonly shutdownSignal?: AbortSignal;
}

interface BudgetState {
  disposed: boolean;
  attached: number;
  source: BudgetAbortSource | null;
}

export function createRequestBudget(
  request: Request,
  effective: EffectiveBudget,
  options: CreateRequestBudgetOptions = {},
): RequestBudget & { dispose(): void } {
  const controller = new AbortController();
  const state: BudgetState = { disposed: false, attached: 0, source: null };
  const deadlineAt = Date.now() + effective.requestTimeoutMs;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const fire = (source: BudgetAbortSource): void => {
    if (state.source !== null || state.disposed) return;
    state.source = source;
    clearTimeout(timer);
    timer = undefined;
    controller.abort(
      new DOMException(`request budget aborted by ${source}`, "AbortError"),
    );
  };

  const sources: ReadonlyArray<{
    signal: AbortSignal;
    source: BudgetAbortSource;
  }> = [
    { signal: request.signal, source: "client" },
    { signal: options.shutdownSignal, source: "shutdown" },
  ].filter(
    (entry): entry is { signal: AbortSignal; source: BudgetAbortSource } =>
      entry.signal !== undefined,
  );

  const listeners: Array<{ signal: AbortSignal; listener: () => void }> = [];
  for (const { signal, source } of sources) {
    // A source may already be aborted (e.g. a disconnected peer); fire
    // immediately — addEventListener would never fire retroactively.
    if (signal.aborted) {
      fire(source);
      break;
    }
    const listener = (): void => fire(source);
    signal.addEventListener("abort", listener, { once: true });
    state.attached += 1;
    listeners.push({ signal, listener });
  }

  if (state.source === null) {
    timer = setTimeout(() => fire("deadline"), effective.requestTimeoutMs);
    // The deadline timer must never hold the process open on its own.
    (timer as { unref?: () => void }).unref?.();
  }

  const dispose = (): void => {
    if (state.disposed) return;
    state.disposed = true;
    clearTimeout(timer);
    timer = undefined;
    for (const { signal, listener } of listeners) {
      signal.removeEventListener("abort", listener);
      state.attached -= 1;
    }
  };

  const budget: RequestBudget & { dispose(): void } = {
    signal: controller.signal,
    requestTimeoutMs: effective.requestTimeoutMs,
    bodyLimits: effective.bodyLimits,
    remainingMs: () => Math.max(0, deadlineAt - Date.now()),
    abortedBy: () => state.source,
    get disposed() {
      return state.disposed;
    },
    get attachedSources() {
      return state.attached;
    },
    dispose,
  };
  return budget;
}

/** Well-known state key; handlers read the budget via getRequestBudget. */
export const REQUEST_BUDGET = Symbol.for("bundar.core.requestBudget");

export function getRequestBudget(context: Context): RequestBudget | undefined {
  const state = context.state as Record<PropertyKey, unknown>;
  const value = state[REQUEST_BUDGET];
  return value === undefined ? undefined : (value as RequestBudget);
}

/**
 * Classifies a failure against the budget that produced it. Abort-like
 * errors are disambiguated by the budget's abort source: a deadline abort is
 * a request timeout (503 path), a client abort is a disconnect (499 path),
 * never a generic 500. Body limit errors classify by the limit they hit.
 */
export function classifyRequestOutcome(
  error: unknown,
  budget?: RequestBudget,
): RequestOutcome {
  if (error === undefined || error === null) return { kind: "completed" };
  const abortedBy = budget?.abortedBy() ?? null;
  if (abortedBy === "deadline") return { kind: "request-timeout" };
  if (abortedBy === "shutdown") return { kind: "server-shutdown" };
  if (error instanceof BodyLimitError) {
    return { kind: "body-limit", detail: error.limit };
  }
  if (abortedBy === "client") return { kind: "client-disconnect" };
  if (error instanceof HttpError) return { kind: "expected-failure" };
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause !== undefined && cause !== null) {
    if (cause instanceof BodyLimitError)
      return { kind: "body-limit", detail: cause.limit };
    if (cause instanceof HttpError) return { kind: "expected-failure" };
  }
  return { kind: "unexpected-failure" };
}

/**
 * Maps a body limit failure to its public envelope: reading too slowly is a
 * 408 request timeout; reading too much is a 413 payload too large. Other
 * limit failures stay 400-class bad requests.
 */
export function bodyLimitToHttpError(error: BodyLimitError): HttpError {
  if (error.limit === "timeoutMs") {
    return new HttpError(
      "request_timeout",
      "request body was not received in time",
      { cause: error },
    );
  }
  if (error.limit === "maxBytes") {
    return new HttpError("payload_too_large", "request body too large", {
      cause: error,
    });
  }
  return new HttpError("bad_request", `body limit exceeded (${error.limit})`, {
    cause: error,
  });
}

export interface RequestBudgetOptions extends BudgetOverrides {
  /** Frozen maximums for validation; defaults to DEFAULT_BUDGET_MAXIMUMS. */
  readonly maximums?: BudgetMaximums;
  /** Server shutdown signal, threaded into every request budget. */
  readonly shutdownSignal?: AbortSignal;
}

/**
 * Deadline middleware: installs the request budget on `context.state`,
 * races the downstream chain against the deadline, converts body limit
 * failures to public envelopes, and disposes the budget (timers, listeners)
 * when the response settles. Overrides are validated once at composition.
 */
export function requestBudget(options: RequestBudgetOptions = {}): Middleware {
  const effective = resolveBudget(
    {
      requestTimeoutMs: options.requestTimeoutMs,
      bodyLimits: options.bodyLimits,
    },
    options.maximums,
  );

  return (context, next) => {
    const budget = createRequestBudget(context.request, effective, {
      shutdownSignal: options.shutdownSignal,
    });
    (context.state as Record<PropertyKey, unknown>)[REQUEST_BUDGET] = budget;

    const expired = new Promise<never>((_, reject) => {
      if (budget.signal.aborted) {
        reject(new RequestTimeoutError(effective.requestTimeoutMs));
        return;
      }
      budget.signal.addEventListener(
        "abort",
        () => {
          if (budget.abortedBy() === "deadline") {
            reject(new RequestTimeoutError(effective.requestTimeoutMs));
          }
          // client/shutdown aborts surface through the downstream error
          // path; racing them here would mask the real outcome.
        },
        { once: true },
      );
    });

    const run = Promise.race([next(context), expired]).finally(() => {
      budget.dispose();
    });

    return run.catch((error: unknown) => {
      if (error instanceof BodyLimitError) {
        throw bodyLimitToHttpError(error);
      }
      // Abort-shaped failures (fetches, renderers, streams) that surface
      // after OUR deadline are timeouts, not disconnects and never 500s.
      if (isAbortLike(error) && budget.abortedBy() === "deadline") {
        throw new RequestTimeoutError(effective.requestTimeoutMs, error);
      }
      throw error;
    });
  };
}
