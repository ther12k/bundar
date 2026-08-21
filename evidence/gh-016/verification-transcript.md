# GH-016 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-016-static-response-fast-path`

## Delivered contract

- The GH-015 compiler's static pass-through is now guarded and proven:
  `compileRoutes` places the caller's `Response` instance into the native
  route table **by reference**; no Bundar closure wraps it.
- New guards: `StaticRouteMetadataError` plus
  `STATIC_ROUTE_FORBIDDEN_META_KEYS` (`middleware`, `dynamic`,
  `per-request`). A static entry declaring such metadata fails closed at
  compile time with guidance to register a handler route instead — this is
  the documented "when a static response becomes a handler" boundary until
  GH-018 middleware exists.
- New benchmark tool `tools/benchmark/static-fast-path.ts`.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/routing/static-fast-path.test.ts
  5 pass, 0 fail, 19 expect calls
  -> exit 0

$ bun tools/benchmark/static-fast-path.ts
  raw-bun: p50=24201ns p95=64067ns mean=35168ns (5000 iterations)
  bundar:  p50=22693ns p95=55433ns mean=27852ns (5000 iterations)
  overhead (p50, bundar vs raw): -6.23%  (within run-to-run noise)
  artifact: evidence/gh-016/static-response-bench.json
  -> exit 0

$ bun test
  112 pass, 0 fail, 2179 expect calls across 19 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (25 files) / pack:inspect / build / format:check
  -> exit 0

$ bun run docs:validate / docs:links
  -> exit 0
```

Tooling decision (documented): the planned `bun run bench -- static-response`
is honored via the dedicated `tools/benchmark/static-fast-path.ts` tool. The
GH-007 harness is in-process by design and cannot exercise Bun's native route
dispatch — exactly the path this issue must measure — so the dedicated tool
runs two real `Bun.serve` instances over localhost (hand-written raw table vs
Bundar-compiled table) and writes the artifact under `evidence/gh-016/`.

## Acceptance evidence

- Object identity: the compiled entry `routes["/static"].GET` **is** the same
  `Response` instance the caller registered (`toBe`, stable across reads).
- No closure: the static entry is a `Response` instance (`typeof "object"`);
  the handler-route contrast case remains `typeof "function"`.
- Behavior matches raw Bun: identical status, body, and every header compared
  header-by-header between the two live servers; 20 concurrent requests
  observe identical bodies.
- Benchmark artifact records overhead versus raw Bun: **−6.23% p50**
  (i.e., no measurable overhead; both dispatch through the identical native
  path since the Response passes by reference). No zero-allocation claim is
  made about Bun internals.
- No mandatory test failure was hidden, skipped, or downgraded.

## Residual risks

- Negative overhead is measurement noise, not a speedup claim; the artifact
  records raw numbers without thresholds.
- The forbidden-meta list is the pre-GH-018 boundary; when middleware lands,
  attaching it to a static entry must explicitly convert it to a handler.
