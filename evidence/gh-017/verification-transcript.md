# GH-017 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-017-request-context`

## Delivered contract

`packages/core/src/context.ts` defines `Context` — the per-request object dynamic
handlers receive as their first argument (per the GH-012 note: "GH-017 extends
the first argument with the request context without changing the return
contract"; `RouteHandler` now types the first parameter as `Context`):

- `request` / `params` — the raw request and Bun-native params, **by reference**.
- `url` — memoized `URL`.
- `query(name)` / `cookie(name)` — lazy, single-parse accessors.
- `services` — frozen app-level map supplied via `compile({ services })` /
  `serve({ services })`.
- `state` — fresh mutable record per request; middleware (GH-018) owns
  extensions here; core never writes to it.

`createContext(request, params, options)` builds the context; `isContext`
guards the shape. The compiler creates a context **only** in the dynamic
handler wrapper — static Response entries never allocate one (GH-016 preserved).

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/context.test.ts
  -> within the 123-pass full run below (8 context tests)

$ bun test ./packages/core/test/concurrency/context-isolation.test.ts
  -> within the full run: 64 concurrent gated requests, zero state leaks

$ bun tools/benchmark/context.ts
  context: p50=812ns p95=2183ns mean=1134ns over 100000 iterations
  artifact: evidence/gh-017/context-bench.json
  -> exit 0

$ bun test
  123 pass, 0 fail, 2212 expect calls across 21 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (26 files) / pack:inspect / build / format:check
  -> exit 0
```

Tooling decision (documented): the planned `bun run bench -- context` contract
is honored by the dedicated `tools/benchmark/context.ts` (the GH-007 harness
measures end-to-end adapters; this issue needs the context-creation step
isolated). Planned test paths run under `bun test ./packages/core`.

## Acceptance evidence

- Context only for dynamic handlers: the static-route entry remains the bare
  `Response` (no wrapper, no context); a live-server test receives a real
  `Context` in the dynamic handler.
- No copying: `context.request === request` and `context.params === params`
  by reference; body never eagerly read (`bodyUsed === false`).
- No cross-request state leaks: 64 requests gated in flight simultaneously,
  each observing only its own `state.owner`; zero `leak:` results; sequential
  requests also observe fresh state.
- Context shape matches the package API document (request/params/url/query/
  cookie/services/state), re-exported from `@bundar/core`.
- Benchmark artifact records context+lazy-access cost: p50 812ns.
- No mandatory test failure hidden, skipped, or downgraded. The handler-first-
  argument change updated in-tree call sites (`route-descriptor.test-d.ts`)
  — the return contract is unchanged.

## Residual risks

- Full params/query/cookie adapters (typed multi-value forms) are GH-019.
- Middleware composition and context extension mechanics are GH-018; `state`
  is the declared extension vehicle.
