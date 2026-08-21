# GH-018 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-018-middleware`

## Delivered contract

`packages/core/src/middleware.ts` exports `composeMiddleware`, `Middleware`
signature `(context, next) => Response | Promise<Response> | void`,
`DoubleNextError`, `MissingResponseError`, `middlewareName`, `isSyncChain`.

- **Onion lifecycle**: middlewares execute in registration order and unwind in
  reverse (`one:before → two:before → terminal → two:after → one:after`).
- **Startup composition**: chains compose once per route at compile time; the
  compiled Bun handler closes over the composed function.
- **Sync fast path**: an all-synchronous chain returns a plain `Response` —
  verified by `instanceof Response` (no framework-created Promise). One async
  participant makes the chain Promise-returning (necessarily).
- **Failures**: double `next()` throws `DoubleNextError`; returning without a
  Response or awaiting next() throws `MissingResponseError`.
- **Scoping** (`App.use`): middleware travels per-route under a frozen
  `meta.middleware` array stamped at registration by the owning scope. Group
  chains evaluate parent scope lazily (parent `use()` after group creation
  still applies). `mount()` **strips the module's own chain** and applies the
  mounting app's chain — module middleware never crosses boundaries silently.
  `compile()` adds no app-level middleware (no double application).

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/middleware
  12 pass, 0 fail (within the 201-test full run)

$ bun tools/benchmark/middleware.ts
  bare (no middleware): p50=121ns | sync x1: p50=149ns
  sync x5: p50=207–246ns | async x1: mean≈200–223ns
  artifact: evidence/gh-018/middleware-bench.json
  -> exit 0

$ bun test
  201 pass, 0 fail, 2435 expect calls across 28 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (32 files) / pack:inspect @bundar/core / build / format:check
  -> exit 0
```

Tooling decisions (documented): planned `bench -- middleware-sync` /
`middleware-async` are honored by the dedicated `tools/benchmark/middleware.ts`
(isolation rationale as GH-029); planned `test/middleware/**` runs within
`bun test ./packages/core`.

## Acceptance evidence

- Ordering/unwind: explicit trace assertions, deterministic across repeats.
- Double next(): throws with the middleware's name.
- Sync-only path: composed result `instanceof Response` (constructor check —
  no Promise allocated); `isSyncChain` classifies participant kinds.
- Scope boundaries (live `Bun.serve`): app middleware fires exactly once per
  request; mounted module's middleware never fires (`hits` contains no
  "module"); group nesting composes outer-then-inner.
- No mandatory test failure hidden, skipped, or downgraded. Two mid-development
  defects (frozen-descriptor middleware stamping, eager chain capture causing
  double application) were found by the tests and fixed.

## Residual risks

- Route-level chains snapshot at registration time; `use()` after
  registration does not retroactively apply (documented semantics).
- Error boundary integration (catching middleware throws into a 500 flow) is
  GH-020 scope.
