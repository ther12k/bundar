/**
 * Per-request context contract (GH-017).
 *
 * Dynamic Bundar handlers receive a `Context` as their first argument. The
 * context owns a lazy, minimal surface: the raw request is never copied, the
 * body is never eagerly read, and query/cookie parsing happens on first
 * access only. `state` is a fresh record per request so nothing leaks across
 * concurrent requests; `services` is the frozen app-level service map.
 *
 * Extension ownership: middleware (GH-018) extends request-scoped data
 * exclusively through `state`. Bundar core never writes to `state`.
 */

import type { RouteParams } from "./routing/types";

/**
 * Shared never-aborted signal used when a request runs without an abort
 * scope (static fast-path or legacy wiring). One instance per process is
 * safe: it can never fire.
 */
const NEVER_ABORTED_SIGNAL = new AbortController().signal;

export type ServiceMap = Readonly<Record<string, unknown>>;

export type RequestState = Record<string, unknown>;

export interface ContextServicesOptions {
  readonly services?: ServiceMap;
  /**
   * Composite cancellation signal for this request (BR-058). When absent,
   * the context exposes a shared never-aborted signal so application code
   * can always read `context.signal`.
   */
  readonly signal?: AbortSignal;
}

export interface Context<
  Params = Record<string, string>,
  Services extends ServiceMap = ServiceMap,
> {
  /** The raw request, by reference. Never copied. */
  readonly request: Request;
  /**
   * Standard cancellation signal combining transport disconnect, budget
   * deadline, and forced shutdown (BR-058). Never rejects with framework
   * internals — application code observes a plain AbortSignal.
   */
  readonly signal: AbortSignal;
  /** Native route parameters provided by Bun's router, by reference. */
  readonly params: Params;
  /** Parsed URL of the request (memoized after first access). */
  readonly url: URL;
  /** Query access; parsing happens once, lazily, on first call. */
  query(name: string): string | null;
  /** Cookie access; the Cookie header is parsed once, lazily. */
  cookie(name: string): string | null;
  /** App-level frozen service map supplied at compile/serve time. */
  readonly services: Services;
  /**
   * Per-request mutable state. A fresh record per context; concurrent
   * requests never share state. Middleware owns extensions here.
   */
  readonly state: RequestState;
}

export function createContext<
  Params = Record<string, string>,
  Services extends ServiceMap = ServiceMap,
>(
  request: Request,
  params: Params,
  options: ContextServicesOptions = {},
): Context<Params, Services> {
  let url: URL | undefined;
  let query: URLSearchParams | undefined;
  let cookies: Map<string, string> | undefined;

  const services = (options.services ?? Object.freeze({})) as Services;

  const context: Context<Params, Services> = {
    request,
    signal: options.signal ?? NEVER_ABORTED_SIGNAL,
    params,
    get url(): URL {
      if (!url) url = new URL(request.url);
      return url;
    },
    query(name: string): string | null {
      if (!query) query = new URL(request.url).searchParams;
      return query.get(name);
    },
    cookie(name: string): string | null {
      if (!cookies) {
        cookies = new Map<string, string>();
        const header = request.headers.get("cookie");
        if (header) {
          for (const part of header.split(";")) {
            const separator = part.indexOf("=");
            if (separator === -1) continue;
            const key = part.slice(0, separator).trim();
            const value = part.slice(separator + 1).trim();
            if (key) cookies.set(key, decodeURIComponent(value));
          }
        }
      }
      return cookies.get(name) ?? null;
    },
    services,
    state: {},
  };

  return context;
}

/** Resolves the Context from a handler's first argument. */
export function isContext(value: unknown): value is Context {
  return (
    typeof value === "object" &&
    value !== null &&
    "request" in value &&
    "params" in value &&
    "state" in value &&
    "services" in value
  );
}

export type { RouteParams };
