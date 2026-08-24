/**
 * HTTP method conformance for Bun-native route tables (BR-069).
 *
 * Bun's router satisfies HEAD from a registered GET handler on its own,
 * running the handler and stripping the body - verified against Bun 1.4.0 by
 * the compatibility fixture in
 * packages/core/test/http-methods/bun-native-behavior.test.ts. It does
 * nothing, however, for a method that was never registered on an otherwise-
 * known path: that request falls through to the application-level `fetch`
 * fallback exactly like a genuinely unknown path, so a bad method and a bad
 * path are indistinguishable without this module (also pinned by the same
 * fixture). Bundar closes that gap by giving Bun a complete per-path method
 * table instead of a partial one - Bun still performs 100% of the request-time
 * matching; this only decides what the entries Bun matches against contain.
 */
import { HTTP_METHODS, type HttpMethod } from "./types";

/**
 * Deterministic `Allow` value for a path given the methods truly registered
 * on it. Sorted and deduplicated (BR-069 acceptance criteria) so the header
 * does not depend on registration order. HEAD is included whenever GET is,
 * since Bun answers HEAD from GET automatically; OPTIONS is always included,
 * since Bundar always answers it (explicitly or automatically).
 */
export function buildAllowHeader(registered: ReadonlySet<HttpMethod>): string {
  const available = new Set<HttpMethod>(registered);
  if (available.has("GET")) available.add("HEAD");
  available.add("OPTIONS");
  return [...available].sort().join(", ");
}

function methodNotAllowed(allow: string): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { "content-type": "text/plain; charset=utf-8", Allow: allow },
  });
}

/**
 * Automatic OPTIONS answer for a path with no explicit OPTIONS registration.
 * 204 with no body, carrying only `Allow` - full CORS negotiation (an
 * `Access-Control-*` response) is explicitly out of scope for BR-069; a
 * consumer that needs it registers an explicit `.options()` handler, which
 * this module never overrides (see `fillMethodGaps`).
 */
function automaticOptions(allow: string): Response {
  return new Response(null, { status: 204, headers: { Allow: allow } });
}

/**
 * Fills every unregistered method on a compiled path's method table with a
 * deterministic 405 (or, for OPTIONS, an automatic 204) instead of leaving
 * Bun to fall those requests through to the application 404. Mutates `group`
 * in place; call once per path, after every route declared against that path
 * has already been compiled into it, so `Object.keys(group)` reflects the
 * complete, final registration.
 *
 * HEAD is left alone when GET is present: Bun already answers it (see the
 * module docstring), and writing a Bundar-owned entry here would shadow that
 * native behavior in exchange for nothing. An explicit registration for any
 * method - including one that overrides the automatic OPTIONS answer - is
 * never touched; this only fills gaps.
 */
export function fillMethodGaps(group: Record<string, unknown>): void {
  const registered = new Set(Object.keys(group)) as Set<HttpMethod>;
  const allow = buildAllowHeader(registered);
  const hasGet = registered.has("GET");

  for (const method of HTTP_METHODS) {
    if (registered.has(method)) continue;
    if (method === "HEAD" && hasGet) continue;
    group[method] =
      method === "OPTIONS" ? automaticOptions(allow) : methodNotAllowed(allow);
  }
}
