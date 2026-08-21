/**
 * Bun.serve route table compiler (GH-015).
 *
 * Compiles Bundar route descriptors into native `Bun.serve({ routes })`
 * entries. Route matching is performed entirely by Bun; Bundar never scans
 * the route list at request time.
 */
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
export interface CompiledServerOptions {
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
 * Compiles descriptors into a Bun route table.
 *
 * - Descriptor paths are normalized and conflict-checked first (GH-014).
 * - Static `Response` entries are passed through untouched so Bun's
 *   zero-allocation static dispatch remains available (GH-016 gate).
 * - Handler routes are wrapped once at compile time; the wrapper reads
 *   `request.params` provided by Bun's router and adapts it to Bundar's
 *   `(request, params)` handler contract.
 *
 * Compilation is deterministic: route table keys and method keys are emitted
 * in registration order.
 */
export function compileRoutes(
  routes: readonly RouteDescriptor[],
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
      for (const method of descriptor.methods) {
        group[method] = descriptor.response;
      }
      continue;
    }

    const handler = descriptor.handler;
    for (const method of descriptor.methods) {
      group[method] = (request) => handler(request, request.params ?? {});
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
