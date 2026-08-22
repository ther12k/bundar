# GH-023 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-023-core-test-matrix`

## Delivered contract

**Contract matrix** (`packages/core/test/integration/contract-matrix.test.ts`)
— one real Bun server covering the complete M1 surface in 13 tests:
- Static responses (fast path), dynamic + typed params (`intParam`), query
  adapters, wildcards, grouped routes with layered middleware ordering,
  mounted modules (module middleware stripped, app middleware applies),
  error flows (expected envelope vs opaque 500 via the GH-020 boundary),
  terminal configured 404.
- Concurrency: 50 concurrent requests each verified against their own
  identity (`user:i:i` for every i — zero cross-talk); repeated context
  creation shows no shared-state leakage.
- Helper surface sweep: response helpers family, body parsing
  (form/json/text with single consumption), manifest generation, conflict
  detection, path normalization fail-closed checks.

**External type-consumer fixture** (`tests/consumer/core/`): imports the
public types through the workspace package name (`App`, `Context`,
`Middleware`, `RouteDescriptor`, …), typechecks against the declarations,
and executes end-to-end (`/hello/:name` served and fetched).

**API report** (`tools/api-report.ts` → `artifacts/api/core.md`): renders
the exact public surface (61 runtime exports listed) as a review snapshot.

**Scripts**: `test:integration:core`, `test:consumer:core`, `api:report`.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun test ./packages/core
  -> within the 352-test full run

$ bun run test:integration:core
  42 pass, 0 fail (integration + middleware + concurrency suites)
  -> exit 0

$ bun run test:consumer:core
  1 pass, 0 fail (external typed consumer, live round-trip)
  -> exit 0

$ bun run test:types
  9 pass, 0 fail
  -> exit 0

$ bun run api:report @bundar/core
  api:report: 61 runtime + 0 type exports → artifacts/api/core.md
  -> exit 0

$ bun test
  352 pass, 0 fail, 2925 expect calls across 45 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (46 files) / pack:inspect @bundar/core / build / format:check
  -> exit 0
```

Tooling decision (documented): the planned `api:report @bundar/core` takes
no argument (the tool targets @bundar/core by design); output lands in
`artifacts/api/core.md` per the suggested-files list.

## Acceptance evidence

- All public M1 behavior maps to tests: matrix rows enumerate static/
  dynamic/parameter/wildcard/grouped/mounted/middleware/error/terminal
  flows; helpers/body/manifest/conflict surfaces each have dedicated tests.
- Race/isolation: 50-request concurrency with per-request identity checks;
  repeat runs isolated (a mid-test shared-state bug in the test itself was
  found and fixed — production code was correct).
- Type declarations consumed externally: fixture imports via package name
  and typechecks under the root project.
- No test command suppresses failures: every suite exits nonzero on any
  failure; no skips exist anywhere in these files.
- Deviations recorded, none skipped silently: static routes reject
  app-level middleware at compile time (GH-016 documented boundary — the
  matrix registers the static route before middleware and asserts the
  boundary indirectly through the existing static-fast-path suite).

## Residual risks

- The matrix intentionally exercises the documented static+middleware
  boundary rather than re-litigating it; a future issue may convert
  static-with-middleware to handler form automatically.
- `artifacts/` is generated (untracked by design per repository-layout).
