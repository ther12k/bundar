/**
 * Startup-composed middleware (GH-018).
 *
 * Middleware runs in a predictable onion — global scope first, then group,
 * then module, then route middleware, unwinding in reverse. The chain is
 * composed ONCE at compile time. Sync-only chains keep a synchronous fast
 * path: no framework-created Promise is allocated when no participant is
 * async. Double `next()` and missing terminal responses fail clearly.
 * Scope is explicit: middleware attached at one scope never silently leaks
 * into a mounted module's routes.
 */
import type { Context } from "./context";
import { notifyMiddlewareComposed } from "./composition-seam";

export type MiddlewareNext = (context: Context) => Response | Promise<Response>;

export type MiddlewareResult = Response | Promise<Response> | void;

export interface Middleware {
  (context: Context, next: MiddlewareNext): MiddlewareResult;
}

export class DoubleNextError extends Error {
  public constructor(middleware: string) {
    super(
      `middleware ${middleware} called next() more than once; next may be invoked exactly one time`,
    );
    this.name = "DoubleNextError";
  }
}

export class MissingResponseError extends Error {
  public constructor(middleware: string) {
    super(
      `middleware chain ended without a response: ${middleware} returned ` +
        `without awaiting next() or providing a Response`,
    );
    this.name = "MissingResponseError";
  }
}

export function middlewareName(middleware: Middleware): string {
  return middleware.name || "<anonymous middleware>";
}

/**
 * Composes a middleware chain once, at compile/startup time.
 *
 * Rules:
 * - A middleware must either return a `Response`/`Promise<Response>` or the
 *   awaited result of `next()`. Returning `undefined` is a chain error.
 * - `next()` may be called exactly once per middleware invocation.
 * - When every middleware is synchronous and the terminal is synchronous,
 *   the composed function returns a plain `Response` — no Promise is created
 *   by the framework anywhere on that path.
 */
export function composeMiddleware(
  middlewares: readonly Middleware[],
  terminal: (context: Context) => Response | Promise<Response>,
): (context: Context) => Response | Promise<Response> {
  if (middlewares.length === 0) {
    return terminal;
  }

  notifyMiddlewareComposed(middlewares.length);
  return function composed(context: Context): Response | Promise<Response> {
    let cursor = -1;

    function dispatch(position: number): Response | Promise<Response> {
      if (position <= cursor) {
        throw new DoubleNextError(middlewareName(middlewares[position]!));
      }
      cursor = position;

      if (position === middlewares.length) {
        return terminal(context);
      }

      const current = middlewares[position]!;
      let nextCalled = false;
      const result = current(context, () => {
        if (nextCalled) {
          throw new DoubleNextError(middlewareName(current));
        }
        nextCalled = true;
        return dispatch(position + 1);
      });

      if (result === undefined || result === null) {
        throw new MissingResponseError(middlewareName(current));
      }

      return result;
    }

    return dispatch(0);
  };
}

/** True when every middleware and the terminal are synchronous functions. */
export function isSyncChain(
  middlewares: readonly Middleware[],
  terminal: (context: Context) => Response | Promise<Response>,
): boolean {
  return (
    terminal.constructor.name !== "AsyncFunction" &&
    middlewares.every((mw) => mw.constructor.name !== "AsyncFunction")
  );
}
