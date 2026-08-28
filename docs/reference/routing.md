# Routing reference

Route registration, parameters, wildcards, modules, and typed URLs are
covered in the guides. This page pins the HTTP method policy.

## Method semantics

| Situation | Behavior |
| --- | --- |
| `HEAD` on a GET-registered path | Handled natively: same status/headers as GET, body stripped by the runtime. Handlers do not run twice. |
| `OPTIONS` on a known path | **Automatic** `204` with a deterministic `Allow` header. No CORS headers are added (out of scope — bring middleware). |
| Known path, unregistered method | `405` with the same sorted `Allow`. |
| Unknown path | Configurable `404` (`notFound` compile option) for every method. |

## Allow header

Sorted alphabetically, deduplicated, and always includes implicit methods:
`HEAD` whenever `GET` is registered, plus `OPTIONS`. Example for
`GET`+`POST`+`PUT`: `GET, HEAD, OPTIONS, POST, PUT`.

## Path matching

- Static entries beat parameter segments; parameters beat wildcards.
- Percent-decoding: parameters arrive decoded (`%41` → `A`).
- Trailing slash: NO implicit redirect or match — `/sync` and `/sync/` are
  different paths.

## Compatibility fixture

The full request matrix (all route forms × method cases) is pinned in
`packages/core/test/http-methods/conformance.test.ts`. A Bun runtime change
that alters any cell fails CI loudly rather than silently changing
framework semantics.

## Edge-case policy

- Registration normalizes trailing slashes and empty segments (`//a//` →
  `/a`).
- **Encoded separators fail closed**: `%2F` / `%5C` in a registered path
  throw `RoutePathValidationError` — Bun matches the DECODED form, so such
  routes would be silently dead. Register the decoded literal instead.
- Control characters in paths are rejected.
- **Duplicate route names** throw `RouteConflictError` naming BOTH paths —
  typed URLs stay one-to-one.
- Percent-encoded values inside parameters decode at the VALUE level
  (`%2F` → `/` inside `:param`, `%E2%9C%94` → ✔); this never splits
  segments.

## Conformance corpus

Table-driven fixtures live in
`packages/core/test/routing/edge-corpus.test.ts`; the live precedence/
encoding matrix is pinned over real sockets.
