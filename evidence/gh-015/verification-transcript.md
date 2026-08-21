# GH-015 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-015-bun-serve-compiler`

## Delivered contract

`@bundar/core` now exports `compileRoutes`, `defaultNotFound`, `CompiledServerOptions`, `BunRouteHandler`, and `BunRouteEntry` from `packages/core/src/routing/compiler.ts`. `App.compile()` returns a deterministic `Bun.serve`-compatible `{ routes, fetch }` configuration and `App.serve({ port })` starts a real server with explicit caller ownership of the returned `Bun.Server`.

Compilation behavior:

- Descriptors are normalized and conflict-checked first (GH-014) — duplicates and invalid path syntax fail at compile time.
- Route table entries are emitted in registration order; method keys follow descriptor method order. Repeated compiles of the same manifest produce identical key order.
- Static `Response` entries are passed to Bun untouched so the zero-allocation static dispatch path remains available (GH-016 gate).
- Handler routes are wrapped once at compile time: the wrapper reads `request.params` populated by Bun's router and forwards `(request, params)` to the Bundar handler contract.
- Unmatched requests fall through to a plain 404 `fetch` fallback (`defaultNotFound`). Route dispatch happens in Bun's router before `fetch` is ever reached; no linear route scan exists in request handlers.

Tooling decision (documented): the planned verification paths run via explicit `./` prefixes (`bun test ./packages/core/test/routing/compiler.test.ts`, `bun test ./packages/core/test/integration/native-routing.test.ts`) because Bun 1.4 treats bare filters as name filters.

Repair note: this branch also fixes root `typecheck` for the GH-039 consumer fixture by adding `@bundar/htmx` path mappings to the root tsconfig — main was failing root typecheck after the GH-039 merge; this was verified broken before the fix and green after it.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/routing/compiler.test.ts
  7 pass, 0 fail, 14 expect calls
  -> exit 0

$ bun test ./packages/core/test/integration/native-routing.test.ts
  5 pass, 0 fail, 13 expect calls  (real Bun.serve on an ephemeral port)
  -> exit 0

$ bun run typecheck
  -> exit 0

$ bun test ./packages/core
  36 pass, 0 fail, 91 expect calls
  -> exit 0

$ bun test
  81 pass, 0 fail, 214 expect calls across 15 files
  -> exit 0

$ bun run lint
  -> exit 0

$ bun run architecture:check
  ok (21 source files, 7 package rules enforced)
  -> exit 0

$ bun run pack:inspect @bundar/core
  runtime dependencies: 0
  -> exit 0

$ bun run build
  -> exit 0

$ bun run docs:validate / docs:links / docs:check / issues:graph
  -> exit 0 (96 issues, 213 edges, no cycles)
```

## Acceptance evidence

- Route matching is performed by Bun: the integration test starts a real
  `Bun.serve`, fetches over a live socket, and Bun extracts `/users/:id`
  parameters itself (`user:42` proves param flow end-to-end).
- No linear scan: compiled handlers are per-method closures in Bun's route
  table; the `fetch` fallback is a plain 404 responder that never consults
  route entries.
- Deterministic: repeated `compile()` calls emit identical key order
  (`/health`, `/users`, `/users/:id` snapshot).
- Unsupported constructs fail at compile time: duplicate normalized
  path/method pairs throw `RouteConflictError`; invalid path syntax throws
  `RoutePathValidationError`.
- No mandatory test failure was hidden, skipped, or downgraded.

## Residual risks

- Bun's native precedence between static and parameterized paths is preserved
  implicitly (Bun owns matching); an explicit precedence fixture is GH-016/GH-022 scope.
- The 404 body is a fixed plain-text response; terminal not-found/method
  behavior customization is GH-022 scope.
- `serve()` accepts only `port`/`hostname` today; TLS/workers options remain
  future issues.
