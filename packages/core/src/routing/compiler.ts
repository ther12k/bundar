/**
 * Bun.serve route table compiler (GH-015, GH-018 middleware composition).
 *
 * Compiles Bundar route descriptors into native `Bun.serve({ routes })`
 * entries. Route matching is performed entirely by Bun; Bundar never scans
 * the route list at request time. Middleware chains compose ONCE here
 * (BR-003): each compiled handler entry stores a precomposed pipeline.
 */
import { createContext, type ContextServicesOptions } from "../context";
import { composeMiddleware, type Middleware } from "../middleware";
import { validateRouteConflicts, type RouteDeclaration } from "./conflicts";
import { createRequestAbortScope } from "../request-abort";
import type { RouteDescriptor } from "./types";

/** Route descriptor carrying its composed middleware chain (compile-time). */
export type MiddlewareRouteDescriptor = RouteDescriptor & {
  middleware?: readonly Middleware[];
};

export type CompileOptions = ContextServicesOptions & {
  /**
   * BR-058: composite cancellation sources threaded from App wiring.
   * `forcedShutdown` comes from the application Lifecycle; the deadline is
   * the request-budget window (GH-067 integration point).
   */
  abort?: {
    readonly forcedShutdown?: AbortSignal;
    readonly deadlineMs?: number | null;
  };
  /** App-level middleware prepended to every route's own chain. */
  middleware?: readonly Middleware[];
};

/**
 * A Bun native route handler. Bun extends Request with a `params` record
 * populated by its own router; Bundar handlers receive `(request, params)`.
 */
export type BunRouteHandler = (
  request: Request & { params: Record<string, string> },
) => Response | Promise<Response>;

/** Bun native per-path route entry. */
export type BunRouteEntry =
  | Response
  | BunRouteHandler
  | { readonly [method: string]: Response | BunRouteHandler };

/** Deterministic subset of Bun's `Serve` options produced by the compiler. */
export interface CompiledServerOptions extends ContextServicesOptions {
  routes: Record<string, BunRouteEntry>;
  fetch: (request: Request) => Response | Promise<Response>;
  /** Terminal behavior hooks (GH-022). */
  error?: (error: Error) => Response | Promise<Response>;
}

/** Configuration for terminal behaviors (GH-022, GH-067). */
export interface TerminalOptions {
  /** Replaces the application 404 (unknown paths reaching fetch). */
  notFound?: (request: Request) => Response | Promise<Response>;
  /**
   * Receives every error thrown from route handlers (including budget
   * timeouts) and must return the error Response. Wired straight through to
   * Bun.serve so the application boundary — not Bun's default opaque 500 —
   * classifies failures.
   */
  error?: (error: Error) => Response | Promise<Response>;
}

export function defaultNotFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * Metadata keys that would force dynamic handling of an otherwise static
 * route. Middleware does not exist yet (GH-018); when it does, attaching it
 * to a static entry must convert the entry to a handler rather than silently
 * discarding the middleware. Until then, such metadata fails closed here.
 */
export const STATIC_ROUTE_FORBIDDEN_META_KEYS: readonly string[] = [
  "middleware",
  "dynamic",
  "per-request",
];

/** Thrown when a static Response entry carries metadata it cannot honor. */
export class StaticRouteMetadataError extends Error {
  public constructor(path: string, key: string) {
    super(
      `static Response route "${path}" declares meta.${key}, which requires dynamic handling; ` +
        `register a handler route instead so the behavior is explicit`,
    );
    this.name = "StaticRouteMetadataError";
  }
}

/**
 * Compiles descriptors into a Bun route table.
 *
 * - Descriptor paths are normalized and conflict-checked first (GH-014).
 * - Static `Response` entries are passed to Bun by reference so Bun's
 *   zero-allocation static dispatch remains available (GH-016): the compiled
 *   entry IS the caller's Response instance, and no Bundar closure wraps it.
 * - Handler routes are wrapped once at compile time; the wrapper reads
 *   `request.params` provided by Bun's router and adapts it to Bundar's
 *   `(request, params)` handler contract.
 *
 * Compilation is deterministic: route table keys and method keys are emitted
 * in registration order.
 */
export function compileRoutes(
  routes: readonly RouteDescriptor[],
  options: CompileOptions & TerminalOptions = {},
): CompiledServerOptions {
  const declarations: RouteDeclaration[] = routes.map((route, index) => ({
    route,
    source: `declaration ${index + 1}`,
  }));
  const normalized = validateRouteConflicts(declarations);

  const routeTable: Record<string, BunRouteEntry> = {};
  const pathGroups = new Map<
    string,
    Record<string, Response | BunRouteHandler>
  >();

  const appMiddleware = options.middleware ?? [];

  for (const descriptor of normalized) {
    let group = pathGroups.get(descriptor.path);
    if (!group) {
      group = {};
      pathGroups.set(descriptor.path, group);
      routeTable[descriptor.path] = group;
    }

    if ("response" in descriptor) {
      if (descriptor.meta) {
        for (const key of STATIC_ROUTE_FORBIDDEN_META_KEYS) {
          if (key in descriptor.meta) {
            throw new StaticRouteMetadataError(descriptor.path, key);
          }
        }
      }
      for (const method of descriptor.methods) {
        group[method] = descriptor.response;
      }
      continue;
    }

    const handler = descriptor.handler;
    // Route-level middleware (captured at registration under meta.middleware)
    // composes after app-level middleware.
    const routeMiddleware = descriptor.meta?.["middleware"] as
      readonly Middleware[] | undefined;
    const chain = [...appMiddleware, ...(routeMiddleware ?? [])];

    // BR-003 (GH-018): the chain is composed exactly once here, per compiled
    // route/method entry, before any request arrives. The request closure
    // below only allocates a Context and runs the precomposed pipeline; it
    // never rebuilds the chain. The terminal resolves params from the live
    // Context so one composed pipeline serves every request.
    const composed =
      chain.length > 0
        ? composeMiddleware(chain, (ctx) => handler(ctx, ctx.params))
        : undefined;

    for (const method of descriptor.methods) {
      // GH-017: a Context is created only here, per dynamic request. Static
      // Response entries above never allocate a Context.
      // BR-058: when abort sources are configured, each request gets ONE
      // composite cancellation scope. That closure MUST be async so dispose()
      // runs after the response settles — a synchronous return would detach
      // listeners before any async work observes them. Without abort
      // sources, the zero-allocation synchronous fast path is preserved.
      const hasAbortSources =
        options.abort !== undefined &&
        ((options.abort.forcedShutdown !== undefined &&
          options.abort.forcedShutdown !== null) ||
          (options.abort.deadlineMs ?? 0) > 0);

      group[method] = hasAbortSources
        ? async (request) => {
            const scope = createRequestAbortScope({
              transport: request.signal,
              forcedShutdown: options.abort?.forcedShutdown ?? null,
              deadlineMs: options.abort?.deadlineMs ?? null,
            });
            const context = createContext(request, request.params ?? {}, {
              ...options,
              signal: scope.signal,
            });
            try {
              // Explicit await is REQUIRED: Bun 1.4.0 runs this finally
              // synchronously on a bare `return promise`, detaching
              // cancellation listeners before async work observes them.
              if (!composed) return await handler(context, context.params);
              return await composed(context);
            } finally {
              scope.dispose();
            }
          }
        : (request) => {
            const context = createContext(
              request,
              request.params ?? {},
              options,
            );
            if (!composed) {
              return handler(context, context.params);
            }
            return composed(context);
          };
    }
  }

  // BR-069: path -> registered methods index for 405/Allow/auto-OPTIONS.
  const methodIndex = new Map<string, string[]>();
  for (const [path, entry] of Object.entries(routeTable)) {
    const methods = Object.keys(entry as Record<string, unknown>)
      .filter((key) => /^[A-Z]+$/.test(key))
      .sort();
    methodIndex.set(path, methods);
  }

  return {
    routes: routeTable,
    fetch(request: Request): Response {
      // BR-069 policy: a KNOWN path hit with an unregistered method answers
      // 405 with a sorted, deduplicated Allow header (registered methods
      // plus implicit HEAD for GET and auto-OPTIONS). OPTIONS itself
      // returns 204 + Allow. Unknown paths keep the GH-022 configurable 404.
      const path = new URL(request.url).pathname;
      let registered = methodIndex.get(path);

      // Dynamic routes (:param / *wildcard) are keyed by their PATTERN in
      // the index; structural-match the request path against those.
      if (registered === undefined) {
        const segments = path.split("/").filter((seg) => seg !== "");
        // BR-070 review: match candidates must follow the SAME precedence
        // Bun uses — static segments first, then params, wildcards last.
        // Registration order would let a late-registered wildcard shadow
        // an earlier param pattern for Allow/OPTIONS decisions.
        const candidates = [...methodIndex.entries()]
          .filter(([pattern]) => pattern.includes(":") || pattern.includes("*"))
          .map(([pattern, methods]) => {
            const parts = pattern.split("/").filter((seg) => seg !== "");
            const statics = parts.filter(
              (seg) => !seg.startsWith(":") && !seg.startsWith("*"),
            ).length;
            const isWildcard =
              parts[parts.length - 1]?.startsWith("*") === true;
            return { pattern, methods, parts, statics, isWildcard };
          })
          .sort((a, b) => {
            // BR-072 review: category precedence first — parameter routes
            // before wildcard routes before bare catch-all — then static
            // specificity within a category. Mirrors documented Bun order.
            const rank = (parts: readonly string[]): number => {
              const last = parts[parts.length - 1] ?? "";
              if (!last.startsWith("*")) return 0; // parameter
              return parts.length === 1 ? 2 : 1; // catch-all / suffix-wildcard
            };
            return (
              rank(a.parts) - rank(b.parts) ||
              Number(a.isWildcard) - Number(b.isWildcard) ||
              b.statics - a.statics
            );
          });
        outer: for (const { pattern, methods } of candidates) {
          if (!pattern.includes(":") && !pattern.includes("*")) continue;
          const parts = pattern.split("/").filter((seg) => seg !== "");
          if (parts.length > 0 && parts[parts.length - 1]!.startsWith("*")) {
            if (segments.length + 1 < parts.length) continue;
          } else if (parts.length !== segments.length) {
            continue;
          }
          for (let i = 0; i < Math.min(parts.length, segments.length); i++) {
            const part = parts[i]!;
            if (part.startsWith("*")) break;
            if (!part.startsWith(":") && part !== segments[i]) continue outer;
          }
          registered = methods;
          break;
        }
      }

      if (registered !== undefined && registered.length > 0) {
        const allow = buildAllowHeader(registered);
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: { allow } });
        }
        if (!registered.includes(request.method)) {
          return new Response(null, { status: 405, headers: { allow } });
        }
      }

      return options.notFound
        ? (options.notFound(request) as Response)
        : defaultNotFound();
    },
    // GH-067: forward the error hook so handler/timeout failures reach the
    // application boundary instead of Bun's default opaque 500.
    ...(options.error ? { error: options.error } : {}),
  };
}

/**
 * BR-069: sorted, deduplicated Allow value including implicit methods
 * (HEAD implied by GET; OPTIONS always offered by the framework).
 */
function buildAllowHeader(registered: readonly string[]): string {
  const allow = new Set<string>(registered);
  if (allow.has("GET")) allow.add("HEAD");
  allow.add("OPTIONS");
  return [...allow].sort().join(", ");
}
