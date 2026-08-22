/**
 * Global error boundary (GH-020).
 *
 * One boundary converts thrown values from handlers and middleware into
 * Responses. Expected `HttpError`s keep their public envelope; unexpected
 * errors become an opaque 500 — stack traces and messages leak only in
 * development. Abort/client-disconnect errors classify separately (no 500
 * noise). If a custom renderer throws, a static safe fallback answers.
 */
import { ClientDisconnectError, isAbortLike, isHttpError } from "./errors";

export type ErrorLogLevel = "debug" | "info" | "warn" | "error";

export interface ErrorLogEntry {
  readonly level: ErrorLogLevel;
  readonly message: string;
  readonly error: unknown;
}

export type ErrorLogger = (entry: ErrorLogEntry) => void;

export interface ErrorBoundaryOptions {
  /** Overrides the environment; defaults to NODE_ENV !== "production" = dev. */
  readonly development?: boolean;
  /** Structured logging hook; receives every classified failure. */
  readonly log?: ErrorLogger;
  /**
   * Custom renderer for unexpected (500) errors. Must return a Response.
   * If it throws, the static safe fallback answers.
   */
  readonly renderUnexpected?: (
    error: unknown,
    development: boolean,
  ) => Response;
}

const SAFE_500_BODY = JSON.stringify({
  error: { code: "internal", message: "Internal Server Error" },
});

function staticFallback(): Response {
  return new Response(SAFE_500_BODY, {
    status: 500,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function renderUnexpected(
  error: unknown,
  development: boolean,
  custom?: ErrorBoundaryOptions["renderUnexpected"],
): Response {
  if (custom) {
    try {
      const rendered = custom(error, development);
      if (rendered instanceof Response) return rendered;
    } catch {
      // custom renderer failed — fall through to the safe fallback
    }
  }
  if (!development) return staticFallback();
  const message = error instanceof Error ? error.message : String(error);
  return new Response(
    JSON.stringify({
      error: {
        code: "internal",
        message: "Internal Server Error",
        ...(development ? { development: { message } } : {}),
      },
    }),
    {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

export class ErrorBoundary {
  private readonly development: boolean;
  private readonly log?: ErrorLogger;
  private readonly customRenderer?: ErrorBoundaryOptions["renderUnexpected"];

  public constructor(options: ErrorBoundaryOptions = {}) {
    this.development =
      options.development ??
      (process.env.NODE_ENV ?? "development") !== "production";
    this.log = options.log;
    this.customRenderer = options.renderUnexpected;
  }

  /**
   * Converts a thrown value into a Response.
   *
   * - `HttpError`: public envelope, exact status, custom headers preserved.
   * - abort/client-disconnect: 499-classified (logged debug, response is a
   *   plain 499 — the client is gone anyway).
   * - anything else: opaque 500 (message only in development).
   * - an already-created `Response` thrown by a handler is preserved.
   */
  public capture(error: unknown): Response {
    if (error instanceof Response) {
      this.log?.({
        level: "info",
        message: "handler threw a Response; preserved",
        error,
      });
      return error;
    }

    if (error instanceof ClientDisconnectError || isAbortLike(error)) {
      this.log?.({
        level: "debug",
        message: "client disconnected during response",
        error,
      });
      return new Response(null, {
        status: 499,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (isHttpError(error)) {
      this.log?.({
        level: "info",
        message: `expected failure ${error.code} (${error.status})`,
        error,
      });
      return error.toResponse();
    }

    this.log?.({
      level: "error",
      message: "unexpected failure",
      error,
    });
    return renderUnexpected(error, this.development, this.customRenderer);
  }

  /** Wraps a handler so its throw routes through this boundary. */
  public wrap<Args extends unknown[]>(
    handler: (...args: Args) => Response | Promise<Response>,
  ): (...args: Args) => Response | Promise<Response> {
    return (...args: Args) => {
      try {
        const result = handler(...args);
        if (result instanceof Promise) {
          return result.catch((error: unknown) => this.capture(error));
        }
        return result;
      } catch (error) {
        return this.capture(error);
      }
    };
  }
}
