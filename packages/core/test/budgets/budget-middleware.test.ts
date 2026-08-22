/**
 * GH-067 middleware coverage: deadline race, cooperative cancellation,
 * body-limit envelopes, and per-request cleanup — composed in process like
 * production (GH-018 semantics).
 */
import { describe, expect, test } from "bun:test";
import {
  composeMiddleware,
  createContext,
  HttpError,
  parseForm,
  requestBudget,
  getRequestBudget,
  text,
} from "../../src/index";
import type { Context, Middleware } from "../../src/index";

function contextFor(path: string, init: RequestInit = {}): Context {
  return createContext(new Request(`http://localhost${path}`, init), {});
}

describe("GH-067 requestBudget middleware", () => {
  test("installs the budget on the request state", async () => {
    const chain = composeMiddleware(
      [requestBudget({ requestTimeoutMs: 1_000 })],
      () => text("ok"),
    );
    const context = contextFor("/x");
    const response = await chain(context);
    expect(response.status).toBe(200);
    const budget = getRequestBudget(context);
    expect(budget).toBeDefined();
    expect(budget!.requestTimeoutMs).toBe(1_000);
    // response settled → budget disposed and listeners removed
    expect(budget!.disposed).toBe(true);
    expect(budget!.attachedSources).toBe(0);
  });

  test("the deadline rejects slow work with a 503 envelope and Retry-After", async () => {
    const chain = composeMiddleware(
      [requestBudget({ requestTimeoutMs: 25 })],
      (context) =>
        new Promise<Response>((_, reject) => {
          const budget = getRequestBudget(context)!;
          budget.signal.addEventListener(
            "abort",
            () => reject(budget.signal.reason),
            { once: true },
          );
        }),
    );
    const startedAt = Date.now();
    const error = await Promise.resolve(chain(contextFor("/slow"))).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    const elapsed = Date.now() - startedAt;
    expect(elapsed).toBeLessThan(2_000);
    expect(error).toBeInstanceOf(HttpError);
    const httpError = error as HttpError;
    expect(httpError.status).toBe(503);
    expect(httpError.code).toBe("service_unavailable");
    expect(httpError.headers["retry-after"]).toBe("1");
  });

  test("slow work that ignores the signal still gets a timely response", async () => {
    // The race must answer at the deadline even when downstream never
    // settles: the dangling promise stays pending but the client is served.
    let danglingSettled = false;
    const never = new Promise<Response>((resolve) => {
      setTimeout(() => {
        danglingSettled = true;
        resolve(text("late"));
      }, 5_000);
    });
    const chain = composeMiddleware(
      [requestBudget({ requestTimeoutMs: 25 })],
      () => never,
    );
    const startedAt = Date.now();
    const error = await Promise.resolve(chain(contextFor("/hang"))).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect((error as HttpError).status).toBe(503);
    expect(danglingSettled).toBe(false);
  });

  test("cooperative handlers observe cancellation through the signal", async () => {
    let observedAbort = false;
    let cleanup = false;
    const chain = composeMiddleware(
      [requestBudget({ requestTimeoutMs: 25 })],
      (context) =>
        new Promise<Response>((resolve) => {
          const budget = getRequestBudget(context)!;
          budget.signal.addEventListener(
            "abort",
            () => {
              observedAbort = true;
              // simulate releasing resources before the promise settles
              cleanup = true;
              resolve(text("too-late"));
            },
            { once: true },
          );
        }),
    );
    // the race answered with the timeout envelope at the deadline …
    const error = await Promise.resolve(chain(contextFor("/coop"))).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect((error as HttpError).status).toBe(503);
    // … and the handler still stopped and released its resources
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(observedAbort).toBe(true);
    expect(cleanup).toBe(true);
  });

  test("body limit failures become public envelopes instead of opaque 500s", async () => {
    const chain: Middleware = requestBudget({
      requestTimeoutMs: 1_000,
      bodyLimits: { timeoutMs: 30 },
    });
    // in-process dribble: a body stream that never finishes within 30ms
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("name=Bundar"));
        // no close — the parser must hit its read timeout
      },
    });
    const request = new Request("http://localhost/form", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: stream,
      duplex: "half",
    });
    const context = createContext(request, {});
    const outcome = chain(context, async (inner) => {
      await parseForm(inner, getRequestBudget(inner)!.bodyLimits);
      return text("unreachable");
    }) as Promise<Response>;
    const error = await outcome.then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(408);
    expect((error as HttpError).code).toBe("request_timeout");
  });

  test("oversized bodies map to 413 through the same middleware", async () => {
    const chain = requestBudget({
      requestTimeoutMs: 1_000,
      bodyLimits: { maxBytes: 8 },
    });
    const request = new Request("http://localhost/form", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "content-length": "64",
      },
      body: "name=far-more-than-eight-bytes",
    });
    const context = createContext(request, {});
    const error = await (
      chain(context, async (inner) => {
        await parseForm(inner, getRequestBudget(inner)!.bodyLimits);
        return text("unreachable");
      }) as Promise<Response>
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect((error as HttpError).status).toBe(413);
  });

  test("fast requests never observe the deadline", async () => {
    const chain = composeMiddleware(
      [requestBudget({ requestTimeoutMs: 5_000 })],
      () => text("fast"),
    );
    const context = contextFor("/fast");
    expect((await chain(context)).status).toBe(200);
    expect(getRequestBudget(context)!.signal.aborted).toBe(false);
  });

  test("renderer aborts after the deadline map to 503, not a 500 leak", async () => {
    // @bundar/jsx's renderer throws an error named AbortedRenderError when
    // its signal fired (name contract — core never imports jsx); a render
    // that surfaces after OUR deadline must classify as a timeout
    const rendererAbort = new Error("render aborted: signal fired");
    rendererAbort.name = "AbortedRenderError";
    const chain = composeMiddleware(
      [requestBudget({ requestTimeoutMs: 40 })],
      (context) =>
        new Promise<Response>((_, reject) => {
          const budget = getRequestBudget(context)!;
          budget.signal.addEventListener("abort", () => reject(rendererAbort), {
            once: true,
          });
        }),
    );
    const error = await Promise.resolve(chain(contextFor("/render"))).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(503);
    expect((error as HttpError).code).toBe("service_unavailable");
  });
});
