
# HTTP method conformance

Bundar compiles route descriptors into a native `Bun.serve({ routes })` table
and lets Bun perform 100% of request-time matching (`packages/core/src/routing/compiler.ts`).
This page documents the policy Bundar layers on top of Bun's own method
handling for HEAD, OPTIONS, 405, and `Allow` (BR-069). It is a policy
document, not an implementation guide - see `packages/core/src/routing/methods.ts`
for the mechanism, and `packages/core/test/http-methods/` for the tests that
enforce it.

## HEAD

GET implies HEAD. Bun's native router runs the registered GET handler and
strips the response body for a HEAD request automatically - Bundar does not
wrap or re-implement this. If a path has no GET handler (registered for other
methods only), HEAD is not implied and is treated as any other unregistered
method: a 405 with `Allow`.

An explicit `.head()` registration always wins over the implicit behavior.

## OPTIONS

Every path Bundar compiles answers OPTIONS one of two ways:

- **Explicit**: a route registered `.options(...)` (directly, or as part of a
  `RouteDescriptor`) answers with exactly what that handler returns. Bundar
  never overrides an explicit registration.
- **Automatic**: a path with no explicit OPTIONS registration gets a
  synthesized `204 No Content` response carrying only the `Allow` header.

**CORS is explicitly out of scope for this policy** (BR-069 acceptance
criteria). The automatic OPTIONS response carries no
`Access-Control-Allow-*` headers. An application that needs CORS preflight
behavior registers an explicit `.options()` handler (or CORS-aware
middleware ahead of it); Bundar's automatic answer only exists so that an
unconfigured path does not silently 404 an OPTIONS probe.

## 404 vs. 405

Bun's native router does not, on its own, distinguish "no route matches this
path" from "a route matches this path, but not this method" - a method with
no per-path table entry falls through to the application `fetch` fallback
exactly like a genuinely unknown path (see the compatibility fixture below).
Bundar closes that gap in `compileRoutes`: after every descriptor for a path
has compiled, any HTTP method the path never registered gets a deterministic
405 response, so only a truly unmatched path reaches the application 404.

This applies uniformly to every route shape Bundar supports: static
`Response` entries, sync and async handlers, wildcard (`/*`) routes,
parameterized (`:id`) routes, and routes registered through `.group()` or
`.mount()` - they all compile down to the same per-path method table, so the
same fill-in-the-gaps pass covers all of them without special-casing any
shape. See `packages/core/test/http-methods/method-conformance.test.ts`.

## `Allow`

The `Allow` header is identical on every synthesized response for a given
path (the automatic OPTIONS 204 and every 405 on that path) and is built by
`buildAllowHeader` in `packages/core/src/routing/methods.ts`:

- every explicitly-registered method, plus
- `HEAD`, whenever `GET` is registered (see above), plus
- `OPTIONS`, always,
- sorted alphabetically and deduplicated - the value never depends on
  registration order.

For example, a path registered only for `GET` reports
`Allow: GET, HEAD, OPTIONS`; a path registered for `POST` only reports
`Allow: OPTIONS, POST`.

## Compatibility fixture

Bundar's method-gap-filling is built entirely on two pieces of Bun's own
native router behavior, pinned against plain `Bun.serve` (no Bundar layer at
all) in `packages/core/test/http-methods/bun-native-behavior.test.ts` so a
future Bun release that changes either one fails CI loudly instead of being
silently inherited:

1. HEAD on a path registered for GET is answered automatically: 200, GET's
   headers, empty body.
2. A method never registered on an otherwise-known path currently falls
   through to the application `fetch` handler - identical to a genuinely
   unknown path. This is exactly the ambiguity Bundar's method-table
   filling exists to remove at the framework level, without changing or
   depending on this native behavior changing.

Verified against Bun 1.4.0, the minimum version `CONTRIBUTING.md` requires.
