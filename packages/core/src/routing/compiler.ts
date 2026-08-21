/**
 * Bun.serve route table compiler (GH-015).
 *
 * Compiles Bundar route descriptors into native `Bun.serve({ routes })`
 * entries. Route matching is performed entirely by Bun; Bundar never scans
 * the route list at request time.
 */
import { createContext, type ContextServicesOptions } from "../context";
import { validateRouteConflicts, type RouteDeclaration } from "./conflicts";
import type { RouteDescriptor } from "./types";

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
  options: ContextServicesOptions = {},
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
    for (const method of descriptor.methods) {
      // GH-017: a Context is created only here, per dynamic request. Static
      // Response entries above never allocate a Context.
      group[method] = (request) => {
        const params = request.params ?? {};
        return handler(createContext(request, params, options), params);
      };
    }
  }

  return {
    routes: routeTable,
    fetch(request: Request): Response {
      void request;
      return defaultNotFound();
    },
  };
}
