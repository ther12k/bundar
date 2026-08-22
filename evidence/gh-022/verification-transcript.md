# GH-022 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-022-terminal-behavior`

## Delivered contract

- **Application not-found fallback** (`compileRoutes({ notFound })` /
  `serve({ notFound })`): unknown paths reaching Bun's fetch fallthrough now
  invoke the configured handler; without one the static default 404 applies.
  `CompiledServerOptions` gains an optional `error` hook slot for the Bun
  error boundary.
- **404 vs 405**: behavior follows what Bun natively exposes — wrong-method
  requests to single-method path entries fall through to fetch (Bun's
  documented 404 behavior); Bundar deliberately invents no router-level
  method negotiation (out of scope per issue).
- **HEAD/OPTIONS defaults**: explicit registrations are never shadowed —
  `HEAD /known` serves the registered HEAD handler (header parity, empty
  body); GET/POST coexist on the same path. No implicit defaults mask
  explicit routes.
- **Server ownership/lifecycle**: `serve()` returns the owning
  `Bun.Server`; `serve()` options now pass through Bun's `idleTimeout`/
  `maxRequestBodySize`. `stop(true)` force-closes immediately; graceful
  `stop()` waits for in-flight requests (verified).

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/integration/terminal-behavior.test.ts
  7 pass, 0 fail (within the 15-test integration run)

$ bun test ./packages/core/test/integration/server-lifecycle.test.ts
  5 pass, 0 fail (ownership, zombie-check, 10× start/stop, graceful in-flight)

$ bun test
  314 pass, 0 fail, 2778 expect calls across 40 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (42 files) / pack:inspect @bundar/core / build / format:check
  -> exit 0
```

## Acceptance evidence

- Unknown path → configured 404 (custom body + content type); default 404
  without configuration; sub-path unknowns also 404.
- Explicit handlers unshadowed: GET 200 + POST 201 on `/known`; PUT-only
  path serves PUT 200 while wrong methods fall through (404/405 per Bun).
- HEAD parity: explicit HEAD route returns status + content-type with an
  empty body.
- No leaked resources: every test stops its server; 10 sequential
  start/stop cycles all refuse connections afterward; graceful stop waits
  for an in-flight 50ms request to complete.
- No mandatory test failure hidden, skipped, or downgraded. Two test-side
  corrections (HEAD handler content-type, graceful vs force stop) — the
  implementation contract was already correct.

## Residual risks

- Router-level 405 negotiation stays unsupported by design absent native Bun
  evidence (issue out-of-scope note honored).
- `Bun.Server` typing marks `port` optional; tests use non-null assertions
  on ephemeral-port servers (always present in practice for port 0).
