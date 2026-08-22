# GH-069 verification transcript — M4 progressive-workflow security gate

## Issue

[GH-069 — Run the M4 progressive-workflow security
gate](../../issues/m4/gh-069-run-the-m4-progressive-workflow-security-gate.md)
(branch `gh-069-m4-gate`, worktree `bundar-gh-069`, base commit `e3bc393`
= main after the GH-068 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/core, @bundar/jsx, @bundar/htmx, @bundar/schema,
  @bundar/security `0.0.0` — all workspace packages at latest merged
  state. Pinned htmx: 2.0.10 (stable) and 4.0.0-beta6 (experimental).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `examples/workflow-gate/` (new): the reference authenticated progressive
  workflow — login (validated form action), items list (negotiated view),
  create (validated form action), delete (action + flash). Composition:
  `sessionMiddleware` globally; `csrfMiddleware` scoped to the action
  group so page renderers issue session-bound synchronizer tokens (both
  the `bundar.csrf` cookie and the hidden `_csrf` field, bound to
  `session.id`); `runFormAction` for validated submissions;
  `action`/`actionResponse` for PRG/fragment composition;
  `errorViewResponse` for 401/404 negotiation; `ErrorBoundary` wired
  through `Bun.serve`'s error hook (`app.compile()` + `error:`).
  Authorization reads only the session (`requireUser`), never HTMX
  metadata.
- `packages/security/src/csrf.ts` (fix): token rotation now applies only
  to state-changing (non-4xx) responses. Defect found by building the
  reference workflow: rotation after a 422 re-render invalidated the very
  token the re-rendered form carries, 403'ing every retry. A 4xx response
  changes no state, so the verified token stays valid for the retry.
  Unit-tested in `packages/security/test/csrf/middleware.test.ts`.
- `tests/workflow/reference-workflow.test.ts` (new, 15 tests): the
  workflow exercised over real HTTP against an in-process server
  (`Bun.serve` on an ephemeral port) with a cookie-jar browser client —
  ordinary (no-JS PRG) lane, enhanced (HTMX) lane, CSRF fail-closed
  matrix, authorization/session isolation, and dialect composition
  (htmx2 + htmx4 experimental adapters).
- `scripts/m4-gate.ts` (new) + `ci:m4` script: the 40-step fail-closed M4
  battery. Carries every ci:m3 step except the eight individual
  `security:*` audit scripts (consolidated into the unified
  `test:security` runner — step-list diff verified), adding
  `security:report` and `test:reference-workflow`. 45 − 8 + 3 = 40.
- `test:reference-workflow` script: `bun test tests/workflow`.
- `delivery/gates/m4.md` (new): the M4 gate record.

## Workflow security semantics verified

1. First visit: GET /login creates the session cookie and issues a CSRF
   token bound to that session identity (page-rendered field + cookie).
2. Synchronizer enforcement: unsafe requests must carry Origin/Sec-Fetch
   evidence, a cookie token, and a submitted token — all three verifying
   against the session binding, cookie == submitted.
3. Missing token, cross-origin, tampered token, and foreign-session
   tokens all fail closed with a generic 403 envelope (no reason leaked).
4. A 422 validation response rotates nothing: the re-rendered form's
   retry verifies with the same token.
5. Success rotates the token; the next form render (PRG GET or enhanced
   region re-fetch) carries the fresh token.
6. Authorization is session-only; enhanced and ordinary unauthenticated
   writes both receive a generic 401 document with no protected content,
   and the write never happens.
7. Sessions are isolated per client; flash messages consume exactly once.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test tests/workflow` — exit 0; 15 tests, 70 expect() calls.
3. `bun test packages/security tests/security` — exit 0; 66 tests (the
   new 422-no-rotation test included), 162 expect() calls.
4. `bun run typecheck` — exit 0.
5. `bun run lint` — exit 0. `bun run format:check` — exit 0 (after
   Prettier on the three new files).
6. `bun test` (full) — exit 0; 679 tests across 81 files, 0 fail, 7,932
   expect() calls.
7. `bun run ci:m4` — exit 0; all 40 ordered steps passed (see the battery
   log excerpt below).

## ci:m4 battery (40 steps, all exit 0)

preflight, format:check, lint, typecheck, test:types, docs:validate,
docs:links, issues:graph, docs:check, architecture tests,
architecture:check, bench:smoke, bench:parity, bench:report (m1
artifact), bench:report (m2 artifact), core contract matrix, core type
consumer, jsx type consumer, schema type consumer, routes type consumer,
routes:check, api:check, pack:inspect ×5 (core, jsx, schema, security,
htmx), htmx:source-diff, test:security (9/9 audits), security:report,
test:reference-workflow, test:browser:htmx2, test:browser:htmx4,
test:browser:report, test:browser:jsx, test:dual-app, conformance:report
(htmx2), conformance:report (htmx4-beta6), test (full suite), build.

## Acceptance evidence

- Workflow source shared across browser modes: one handler set serves
  both lanes (`tests/workflow/reference-workflow.test.ts`, ordinary and
  enhanced describes).
- Authorization independent of HTMX metadata: `requireUser` in
  `examples/workflow-gate/workflow.ts` reads only the session; the
  enhanced-unauthenticated-write test asserts no state change.
- All M4 mandatory gates pass: `ci:m4` 40/40 exit 0.
- No security limitation hidden behind example-only assumptions: the
  token-rotation contract (re-render between state changes), in-memory
  store, and `secure: false` cookies are documented as example/test
  environment settings in the gate record's residual risks.
- No hidden failures: 679/679 tests, 0 skips without documented reason.

## Residual risks and deviations

- Multi-action enhanced sessions must re-render the form region between
  state changes (token rotation). Documented; the PRG document flow does
  it automatically.
- The example runs an in-memory session store with `secure: false` for
  the local environment; production must supply a durable store and
  secure cookies (GH-062 documents both).
- Uploads have no route in this workflow; upload safety remains gated by
  GH-064 and the uploads audit inside the same battery.
- htmx 4 remains experimental (4.0.0-beta6); no GA claim.

## Newly unblocked issues

GH-071 (create-bundar scaffolding), GH-079 (API reference), and the M5
chain; GH-082 proceeds in M6 with this gate as its security baseline.
