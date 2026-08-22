/**
 * GH-067 unit coverage: policy validation, budget lifecycle, cleanup, and
 * outcome classification.
 */
import { describe, expect, test } from "bun:test";
import {
  bodyLimitToHttpError,
  BudgetPolicyError,
  classifyRequestOutcome,
  createRequestBudget,
  DEFAULT_BUDGET_MAXIMUMS,
  ErrorBoundary,
  HttpError,
  resolveBudget,
} from "../../src/index";
import { BodyLimitError } from "../../src/request/body";

describe("GH-067 resolveBudget policy", () => {
  test("defaults resolve to the documented maximums", () => {
    const effective = resolveBudget();
    expect(effective.requestTimeoutMs).toBe(
      DEFAULT_BUDGET_MAXIMUMS.requestTimeoutMs,
    );
    expect(effective.bodyLimits.timeoutMs).toBe(
      DEFAULT_BUDGET_MAXIMUMS.bodyTimeoutMs,
    );
    expect(Object.isFrozen(effective)).toBe(true);
    expect(Object.isFrozen(effective.bodyLimits)).toBe(true);
  });

  test("routes may tighten within the maximums", () => {
    const effective = resolveBudget({
      requestTimeoutMs: 100,
      bodyLimits: { timeoutMs: 50, maxBytes: 2048 },
    });
    expect(effective.requestTimeoutMs).toBe(100);
    expect(effective.bodyLimits.timeoutMs).toBe(50);
    expect(effective.bodyLimits.maxBytes).toBe(2048);
  });

  test("a route cannot exceed the server maximums — fail closed at startup", () => {
    expect(() =>
      resolveBudget({
        requestTimeoutMs: DEFAULT_BUDGET_MAXIMUMS.requestTimeoutMs + 1,
      }),
    ).toThrow(BudgetPolicyError);
    expect(() => resolveBudget({ bodyLimits: { timeoutMs: 60_000 } })).toThrow(
      BudgetPolicyError,
    );
    expect(() =>
      resolveBudget({ bodyLimits: { maxBytes: 10 * 1024 * 1024 } }),
    ).toThrow(BudgetPolicyError);
  });

  test("invalid values are rejected, not clamped", () => {
    expect(() => resolveBudget({ requestTimeoutMs: 0 })).toThrow(
      BudgetPolicyError,
    );
    expect(() => resolveBudget({ requestTimeoutMs: Number.NaN })).toThrow(
      BudgetPolicyError,
    );
    expect(() => resolveBudget({ bodyLimits: { maxFields: -1 } })).toThrow(
      BudgetPolicyError,
    );
  });

  test("custom maximums cap overrides", () => {
    const maximums = {
      requestTimeoutMs: 1_000,
      bodyTimeoutMs: 500,
      maxBytes: 4096,
    };
    expect(
      resolveBudget({ requestTimeoutMs: 1_000 }, maximums).requestTimeoutMs,
    ).toBe(1_000);
    expect(() => resolveBudget({ requestTimeoutMs: 1_001 }, maximums)).toThrow(
      BudgetPolicyError,
    );
  });
});

describe("GH-067 request budget lifecycle", () => {
  test("the deadline aborts the composite signal with a timeout source", async () => {
    const request = new Request("http://localhost/slow");
    const budget = createRequestBudget(
      request,
      resolveBudget({ requestTimeoutMs: 20 }),
    );
    expect(budget.remainingMs()).toBeGreaterThan(0);
    expect(budget.abortedBy()).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(budget.signal.aborted).toBe(true);
    expect(budget.abortedBy()).toBe("deadline");
    expect(budget.remainingMs()).toBe(0);
    budget.dispose();
  });

  test("an already-disconnected request fires the client source immediately", () => {
    const controller = new AbortController();
    controller.abort();
    const budget = createRequestBudget(
      new Request("http://localhost/x", { signal: controller.signal }),
      resolveBudget({ requestTimeoutMs: 5_000 }),
    );
    expect(budget.signal.aborted).toBe(true);
    expect(budget.abortedBy()).toBe("client");
    budget.dispose();
  });

  test("dispose removes every source listener and clears the timer", async () => {
    const shutdown = new AbortController();
    const request = new Request("http://localhost/x");
    const budget = createRequestBudget(
      request,
      resolveBudget({ requestTimeoutMs: 10_000 }),
      { shutdownSignal: shutdown.signal },
    );
    expect(budget.attachedSources).toBe(2);
    budget.dispose();
    expect(budget.disposed).toBe(true);
    expect(budget.attachedSources).toBe(0);
    // dispose is idempotent
    budget.dispose();
    expect(budget.attachedSources).toBe(0);
    // after dispose, aborting a source must not fire the composite signal
    shutdown.abort();
    expect(budget.signal.aborted).toBe(false);
  });

  test("the shutdown source classifies separately from client and deadline", () => {
    const shutdown = new AbortController();
    const budget = createRequestBudget(
      new Request("http://localhost/x"),
      resolveBudget({ requestTimeoutMs: 10_000 }),
      { shutdownSignal: shutdown.signal },
    );
    shutdown.abort();
    expect(budget.abortedBy()).toBe("shutdown");
    budget.dispose();
  });
});

describe("GH-067 outcome classification", () => {
  test("deadline aborts classify as request-timeout, never generic 500", async () => {
    const budget = createRequestBudget(
      new Request("http://localhost/x"),
      resolveBudget({ requestTimeoutMs: 10 }),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    const abortLike = new DOMException(
      "The operation was aborted.",
      "AbortError",
    );
    expect(classifyRequestOutcome(abortLike, budget).kind).toBe(
      "request-timeout",
    );
    budget.dispose();
  });

  test("client disconnects classify by source, not error shape", () => {
    const client = new AbortController();
    const budget = createRequestBudget(
      new Request("http://localhost/x", { signal: client.signal }),
      resolveBudget({ requestTimeoutMs: 10_000 }),
    );
    client.abort();
    expect(
      classifyRequestOutcome(new Error("renderer stopped"), budget).kind,
    ).toBe("client-disconnect");
    budget.dispose();
  });

  test("body limit errors classify by the limit they hit", () => {
    expect(
      classifyRequestOutcome(new BodyLimitError("timeoutMs", "10s")).kind,
    ).toBe("body-limit");
    expect(
      classifyRequestOutcome(new BodyLimitError("maxBytes", "1MiB")).kind,
    ).toBe("body-limit");
  });

  test("expected and unexpected failures stay distinguishable", () => {
    expect(
      classifyRequestOutcome(new HttpError("not_found", "nope")).kind,
    ).toBe("expected-failure");
    expect(classifyRequestOutcome(new Error("boom")).kind).toBe(
      "unexpected-failure",
    );
    expect(classifyRequestOutcome(undefined).kind).toBe("completed");
  });

  test("body limit envelopes map to public statuses", () => {
    expect(
      bodyLimitToHttpError(new BodyLimitError("timeoutMs", "10s")).status,
    ).toBe(408);
    expect(
      bodyLimitToHttpError(new BodyLimitError("maxBytes", "1MiB")).status,
    ).toBe(413);
    expect(
      bodyLimitToHttpError(new BodyLimitError("maxFields", "100")).status,
    ).toBe(400);
  });

  test("renderer abort errors classify as aborts through the boundary (499, not 500)", () => {
    const boundary = new ErrorBoundary({ development: false });
    const rendererAbort = new Error("render aborted: signal fired");
    rendererAbort.name = "AbortedRenderError";
    const response = boundary.capture(rendererAbort);
    expect(response.status).toBe(499);
    expect(response.status).not.toBe(500);
  });
});
