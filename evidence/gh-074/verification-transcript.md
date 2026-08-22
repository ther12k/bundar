# GH-074 verification transcript — in-process test client and request helpers

## Issue

[GH-074 — Implement the in-process test client and request
helpers](../../issues/m5/gh-074-implement-the-in-process-test-client-and-request-helpers.md)
(branch `gh-074-test-client`, worktree `bundar-gh-074`, base commit
`a77d37d` = main after the GH-069 lockfile follow-up).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- All @bundar workspace packages `0.0.0`; pinned htmx 2.0.10 (stable) and
  4.0.0-beta6 (experimental — no GA claim).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs. No browser required
  (in-process by design; the real-server transport uses loopback HTTP).

## What changed

- `packages/testing/src/client.ts` (new): `createTestClient(app | module |
  compiled)` — in-process matching and dispatch over the compiled route
  table (no socket), per-client `CookieJar`, `submitForm` /
  `submitMultipart` / `submitJson`, dialect-aware `enhancedGet` /
  `enhancedSubmitForm`, PRG `follow()`, `dispose()`, and one-shot
  `inject()`. Uncaught handler errors REJECT when no `error` hook is
  compiled (documented semantic); with a hook the hook's response mirrors
  the server.
- `packages/testing/src/match.ts` (new): the supported-subset route
  matcher — exact paths, `:param` segments, `*` wildcard tails, 405 with
  allowed methods, 404 otherwise; params attached the way Bun.serve
  injects them.
- `packages/testing/src/request.ts` (new): `formRequest`, `jsonRequest`,
  `multipartRequest` (+ `fileFixture`), `enhancedRequest` — enhanced
  headers built via `buildHtmxRequestHeaders` (@bundar/htmx), never
  hand-written.
- `packages/testing/src/cookies.ts` (new): `CookieJar` (last-write-wins
  absorption, clearing, replay header) and `responseCookies`.
- `packages/testing/src/server.ts` (new): `startTestServer` (ephemeral
  port, transport-backed client with the SAME interface, Bun's default
  opaque 500 wired explicitly to avoid uncaught-error noise),
  `stopAllTestServers` registry, and `withRealServer` guaranteed teardown.
- `packages/htmx/src/neutral.ts` (+`dialects/v4/index.ts`, `index.ts`):
  new `buildHtmxRequestHeaders(options, dialect?)` public helper; the v4
  beta adapter carries `requestHeaderAliases` as DATA in its metadata
  (trigger under the beta's source-header name), so no consumer branches
  on dialect. Raw protocol strings remain confined to @bundar/htmx — the
  architecture harness enforces it, and it caught this branch's first
  draft (fixed by asserting through neutral readers/adapter decoders).
- `packages/testing/test/` (new, 43 tests): matcher, builders + jar,
  client (one fixture across no-JS / htmx2 / htmx4 / raw fetch; PRG
  chains; cookie round-trips; 404/405; error semantics), server (parity,
  port release, idempotent stop, teardown-on-failure).
- `packages/htmx/test/request-headers.test.ts` (new, 4 tests): canonical
  defaults, full option set, per-adapter aliasing.
- `tests/consumer/testing/` (new, 4 tests): external consumption of the
  public surface — four modes from one fixture, PRG + jar + inject,
  real-server opt-in, port reuse after stop.
- `test:consumer:testing` script; `@bundar/testing` workspace deps
  (core/htmx/jsx/schema per ADR-0016 boundaries) + root tsconfig path
  mapping; `packages/testing/README.md` rewritten with the semantics
  table and leak-safe teardown contract.

## Tooling decision (documented substitution)

The issue's planned `bun run test:leaks -- testing` script does not exist
in the repository. Equivalent-or-stronger evidence provided: the
real-server tests assert the leak-safety properties directly — port
release after `stop()` (immediate rebind on the same port), idempotent
stop, guaranteed teardown on failure via `withRealServer`, and the
`stopAllTestServers()` afterAll registry — plus per-client jar isolation.
Recorded here as the substitution per the issue's verification note.

## Exact commands and exit statuses

1. `bun install` (workspace deps for @bundar/testing) — exit 0;
   `bun install --frozen-lockfile` — exit 0 afterward.
2. `bun test packages/testing` — exit 0; 43 tests, 86 expect() calls.
3. `bun run test:consumer:testing` — exit 0; 4 tests, 13 expect() calls.
4. `bun test packages/htmx/test/request-headers.test.ts` — exit 0; 4 tests.
5. `bun run typecheck` — exit 0 (root; includes packages/*/src+test).
6. `bun run lint` — exit 0. `bun run format:check` — exit 0.
7. `bun run architecture:check` — exit 0 (82 source files, 8 package
   rules enforced); `bun test tests/architecture` — exit 0 (the frozen
   rules run against the real workspace inside the suite).
8. `bun run pack:inspect @bundar/testing` — exit 0 (files allow-list
   src+README, no runtime deps beyond the four allowed workspace deps).
9. `bun run api:check` — exit 0 (core surface unchanged: 77 runtime + 0
   type exports match the committed snapshot).
10. `bun run build` — exit 0 (all packages, @bundar/testing included).
11. `bun run docs:validate` / `docs:links` / `docs:check` — exit 0 (215
    documents, 1,159 links, 14 manifests).
12. `bun test` (full) — exit 0; 730 tests across 87 files, 8,045 expect()
    calls, 0 fail, 0 unexplained skips.

## Acceptance evidence

- **One fixture, four modes**: `packages/testing/test/client.test.ts`
  drives the same app as ordinary GET (document), htmx2 enhanced GET
  (fragment), htmx4-beta enhanced GET (same fragment), and raw `fetch`;
  the consumer test repeats it through the public surface only.
- **Cookies and redirects predictable**: jar absorption/round-trip/clear
  tests; PRG `follow()` settles 303 → document; transport follows chains
  over real HTTP.
- **Real ephemeral server opt-in**: `startTestServer` /
  `withRealServer` / registry — with parity assertions against the
  in-process client.
- **Testing package modifies no production behavior**: it imports public
  APIs only; no production package imports it (architecture:check,
  boundary rule `@bundar/testing` consumers = none allowed to be imported
  BY it beyond core/jsx/htmx/schema; api:check proves core unchanged).

## Residual risks and deviations

- The in-process matcher supports the Bun route subset this framework
  emits (exact / `:param` / `*`); exotic Bun patterns would diverge —
  tests needing Bun's native matcher use `startTestServer` (documented).
- `follow()` replays redirects as GET (PRG); 307/308 method-preserving
  replay is out of scope (the action composer emits 303 for ordinary
  submissions).
- `test:leaks` substitution recorded above.

## Newly unblocked issues

GH-075 (minimal starter template) — and with GH-072/GH-071 also
progressing, the M5 chain toward the GH-081 usability gate.
