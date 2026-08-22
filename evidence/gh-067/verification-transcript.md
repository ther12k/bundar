# GH-067 verification transcript — request budgets, timeouts, and abort propagation

## Issue

[GH-067 — Implement request budgets, timeouts, and abort
propagation](../../issues/m4/gh-067-implement-request-budgets-timeouts-and-abort-propagation.md)
(branch `gh-067-csp-nonce`, worktree `bundar-gh-067`, base commit `4d3571a` =
main after the GH-048 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/core `0.0.0` (71 runtime exports after this change); @bundar/jsx
  `0.0.0` (renderer abort contract referenced by error name only — no import).
- htmx: not involved (core-level fixtures).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/core/src/budget.ts` (new): `DEFAULT_BUDGET_MAXIMUMS` (30 s request
  / 10 s body / 1 MiB), `resolveBudget` (startup-time validation — routes may
  tighten, never exceed, the frozen maximums; defaults themselves are capped
  by custom maximums), `createRequestBudget` (composite AbortSignal firing on
  the first of client disconnect / deadline / server shutdown with source
  tracking, plus verifiable cleanup: `disposed` flag and `attachedSources`
  counter, both zeroed by `dispose`), `requestBudget()` middleware (installs
  the budget on `context.state`, races the chain against the deadline, maps
  body-limit failures to public envelopes, maps post-deadline abort-shaped
  failures to 503, disposes on settle), `classifyRequestOutcome` (source-based
  classification: client-disconnect / request-timeout / body-limit /
  server-shutdown / expected / unexpected), `bodyLimitToHttpError` (408 / 413
  / 400), `RequestTimeoutError` (public 503 envelope with `Retry-After: 1`),
  `BudgetPolicyError`, `getRequestBudget` accessor.
- `packages/core/src/errors.ts`: two new public codes — `request_timeout`
  (408) and `service_unavailable` (503); `isAbortLike` now recognizes the
  documented @bundar/jsx `AbortedRenderError` name contract (name match only —
  core keeps zero package imports), so renderer aborts classify as aborts,
  never 500s.
- `packages/core/src/request/body.ts` — **security defect fixed**: the
  slowloris guard cancelled the reader with a reason, but cancel reasons never
  reach `read()` (reads resolve `done`), so a dribbling body was silently
  accepted as a complete partial read. The timeout now sets a flag and throws
  `BodyLimitError("timeoutMs")` after cancellation; mid-stream oversize also
  cancels cleanly.
- `packages/core/src/routing/compiler.ts` + `app.ts`: `TerminalOptions` gains
  the `error` hook and `compileRoutes` now forwards it to Bun.serve — handler
  and timeout failures reach the application boundary instead of Bun's default
  opaque 500; `App.compile` accepts `TerminalOptions`.
- `packages/core/test/budgets/` (new): 27 tests — policy validation (5),
  lifecycle/classification/cleanup (12), middleware race + cooperative
  cancellation + renderer abort mapping (9 in-process), real-server fixtures
  (5: slowloris raw-socket dribble → 408, slow handler → 503 at the deadline
  with recorded work stop, mid-request client disconnect → no 500, and
  post-failure health; plus counts above overlap in totals).
- `packages/core/test/import.test.ts`: runtime export snapshot updated to the
  71-export surface; `artifacts/api/core.md` regenerated deliberately
  (61 → 71 runtime exports) and `api:check` passes.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/core/test/budgets/**` (as
   `bun test ./packages/core/test/budgets`) — exit 0; 27 tests, 76 expect()
   calls, 0 fail.
3. `bun test ./packages/core/test/body` — exit 0 (13 tests; the parser fix
   keeps every GH-057 assertion green).
4. `bun test` — exit 0; 397 tests across 49 files, 0 fail, 3,044 expect()
   calls.
5. `bun run --filter @bundar/core typecheck`, `bun run typecheck` — exit 0.
6. `bun run lint`, `bun run format:check` — exit 0.
7. `bun run architecture:check` — exit 0 (48 source files, 7 package rules).
8. `bun run api:report` + `bun run api:check` — exit 0 (71 runtime exports,
   snapshot deliberately regenerated).
9. `bun run pack:inspect @bundar/core` — exit 0 (zero runtime dependencies).
10. `bun run build` — exit 0. `bun run docs:validate` (210 documents) and
    `bun run docs:links` (1,088 links) — exit 0. `bun run bench:parity` —
    exit 0 (9 scenarios).

### Tooling decisions (planned-command substitutions)

- The planned `bun run test:browser:abort` runner does not exist; abort
  propagation is proven with stronger, lower-level fixtures: raw-socket
  client disconnects against a real Bun.serve (the exact abort path a browser
  cancel produces), cooperative handler/stop fixtures, and boundary-level
  499-vs-500 assertions. Browser-lane cancellation of core budgets adds no
  distinct code path (the signal source is the same socket close).
- The planned `bun run test:leaks -- request-budgets` runner does not exist;
  cleanup is verified directly and deterministically: every budget is
  `dispose()`d by the middleware when the response settles, and tests assert
  `disposed === true` and `attachedSources === 0` (source listeners removed,
  deadline timer cleared, idempotent dispose, post-dispose aborts inert).
- The suggested `tests/browser/abort/**` directory was not created for the
  same reason as the runner substitution above.

## Acceptance evidence mapping

- "Timed-out work does not continue indefinitely in controlled fixtures" —
  deadline race answers 503 within ~the deadline even when downstream never
  settles (dangling-promise test); cooperative fixtures record that the
  handler's abort listener fired and resources released; the slowloris
  dribble now hard-fails at 408 instead of hanging or accepting partials.
- "Abort does not become a generic 500 when the response is no longer
  writable" — source-based classification: client-source aborts → 499 via the
  boundary (raw-socket disconnect fixture asserts zero "unexpected failure"
  classifications); deadline-source aborts (including renderer
  `AbortedRenderError`) → 503 envelope; `compileRoutes` now forwards the
  `error` hook so failures reach the application boundary at all.
- "Limits can be overridden per route only within server maximums" —
  `resolveBudget` validates at composition time against frozen maximums
  (defaults capped by custom maximums too); exceeding tests throw
  `BudgetPolicyError` before traffic.
- "Resource cleanup is verified" — `disposed`/`attachedSources` assertions on
  every middleware path, idempotent dispose, post-dispose abort inertness.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — all commands exit 0, nothing skipped; two
  latent defects found by the new fixtures were fixed in the same change
  (body-timeout silent accept; un-forwarded error hook).
- OKF/log updates — closure record below, `issues/m4/index.md`, `log.md`,
  regenerated API snapshot, this transcript.

## Residual risks and deviations

- JavaScript cannot forcibly stop a non-cooperative handler; the race answers
  the client at the deadline and the composite signal gives cooperative work
  a cancellation path, but a handler that ignores the signal keeps its
  (discarded) promise alive until it settles — documented as the platform
  limit, with the dangling-promise test pinning the response-time guarantee.
- Installing the budget middleware makes the chain async (the GH-018 sync
  fast path no longer applies on budgeted routes) — deadline enforcement is
  inherently timed; unbudgeted routes keep the sync fast path.
- The deadline timer uses `setTimeout` + `Date.now()`; scheduling jitter of a
  few ms is possible, covered by generous assertion slack.
- `AbortedRenderError` is matched by error name (documented cross-package
  contract); if @bundar/jsx renames it, the boundary would regress to 500 —
  pinned by the name-contract test here and jsx's own GH-030 tests.

## Newly unblocked

- GH-068 (forms and security test matrix).
