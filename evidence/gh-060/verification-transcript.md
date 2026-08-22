# GH-060 verification transcript — progressive validated form actions

## Issue

[GH-060 — Implement progressive validated form
actions](../../issues/m4/gh-060-implement-progressive-validated-form-actions.md)
(branch `gh-060-form-actions`, worktree `bundar-gh-060`, base commit
`493a10f` = main after the GH-065 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` — now depends on @bundar/core, @bundar/jsx, and
  @bundar/schema (workspace; the ADR-0016 text's htmx row already listed
  these imports as the allowed direction; boundaries.json updated to match
  the frozen ADR text — core/jsx still zero-dependency).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`;
  dialect lanes htmx `2.0.10` / `4.0.0-beta6` (never claimed GA).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/form-action.ts` (new): `runFormAction(context,
  definition)` composes the pipeline — bounded parsing (GH-057) → Standard
  Schema validation (GH-058, identical business validation for both
  worlds) → invalid: GH-065 error-view negotiation rendering the form
  region (enhanced) or full document (ordinary) from the GH-059
  field-error model with **redacted** retained values (the form renderer
  receives `model.submitted`, never the raw submission — passwords dropped
  by policy) and a first-error focus hint; valid: the success fragment
  builder runs EXACTLY ONCE per request inside optional transaction hooks
  (begin/commit/rollback; business failure inside the builder rolls back
  before any response is composed), then the GH-050 action response
  (fragment + directives + Vary + cache policy for enhanced; approved PRG
  redirect for ordinary). `INVALID_SUBMISSION_STATUS = 422` for both
  worlds (documented semantics). `InvalidFormRender` is the renderer
  contract.
- Package wiring: htmx gains `@bundar/core` + `@bundar/schema` workspace
  dependencies (permitted direction per ADR-0016's frozen htmx row;
  boundaries.json aligned; architecture check green at 8 rules/66 files;
  pack:inspect green for htmx and schema).
- Tests: `packages/htmx/test/form-actions/form-action.test.ts` (7) —
  invalid no-JS document, invalid enhanced fragment with retarget, secret
  redaction (hunter2 never rendered), identical-validation parity,
  exactly-once success + both-worlds semantics, transaction commit and
  rollback ordering, HTML-only error delivery.
- Browser lanes: `/validated-form` route through `runFormAction`; a
  `validated-form` scenario hard-asserted in BOTH lanes: invalid enhanced
  → 422 fragment (`id="register"`, "Name too short", no `<html>`,
  `hx-retarget: #register-card`); invalid ordinary → 422 full document;
  valid enhanced → 200 `hi Bundar`; valid ordinary → opaque redirect (the
  browser-visible form of the approved PRG).
- `packages/htmx/README.md`: form-actions section.

## Exact commands and exit statuses

1. `bun install` (lockfile updated for the two new workspace edges) then
   `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/progressive-action.test.ts` contract: the
   suggested filename did not exist in the plan's own layout; the suite
   lives at `packages/htmx/test/form-actions/form-action.test.ts` (the
   issue's suggested `packages/schema/src/action.ts` location was
   superseded by the htmx-side `form-action.ts` since the composer
   integrates the htmx action/error/negotiation layers) — `bun test
   ./packages/htmx/test/form-actions` — exit 0; 7 tests, 0 fail.
3. `bun run test:browser:htmx2` / `htmx4` — exit 0; the validated-form
   scenario passed in both lanes
   (`output/playwright/*/validated-form.json`).
4. `bun run --filter @bundar/htmx typecheck`, `--filter @bundar/schema`,
   root `bun run typecheck` — exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 567 tests across 69 files, 0 fail, 7,604
   expect() calls.
7. `bun run architecture:check` — exit 0 (66 source files, 8 rules).
8. `bun run pack:inspect @bundar/htmx` and `@bundar/schema` — exit 0.
9. `bun run build` — exit 0. `bun run docs:validate` (213 documents) /
   `docs:links` (1,119 links) — exit 0.

### Tooling decisions

- The planned `test:browser:dual -- validated-form` / `test:browser:no-js
  -- validated-form` runners do not exist; one scenario in BOTH existing
  lanes asserts the enhanced AND ordinary (no-JS) paths together
  (established dual-lane substitution).
- The suggested `packages/schema/src/action.ts` file location was
  implemented as `packages/htmx/src/form-action.ts`: the pipeline composes
  the htmx action/error/negotiation layers (GH-050/065), and keeping it in
  schema would have required schema→htmx (a forbidden direction). Documented
  deviation, equivalent-or-stronger evidence.

## Acceptance evidence mapping

- "A no-JS invalid submission returns a usable page with errors" — unit
  (422 document with the error summary) + browser (ordinary 422 full
  document).
- "An enhanced invalid submission replaces only the form/error region" —
  unit (fragment without `<html>`, retarget `#register-card`) + browser
  (same assertions in both lanes).
- "The valid path executes exactly once and returns approved action
  semantics" — the exactly-once counter test; transaction commit/rollback
  ordering test; approved 200/fragment and PRG redirect semantics in both
  worlds.
- "No JSON client code is required for field errors" — HTML-only responses
  asserted; field errors render inside the form region.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped; the
  secret-redaction defect found while testing (raw submitted leaked into
  renderForm) was FIXED in the composer.
- OKF/log updates — htmx README, closure record, `issues/m4/index.md`,
  `log.md`, this transcript.

## Residual risks

- Transaction hooks are app-owned; the composer guarantees begin→(rollback
  on failure | commit after exactly-once success), not database semantics
  (out of scope by design).
- Invalid-submission status is 422 in both worlds by documented contract;
  apps needing different statuses wrap the composer.
- The htmx package now imports core/schema (allowed direction per the
  frozen ADR text); any further edge change requires an ADR.

## Newly unblocked

- GH-068 (forms/security matrix — awaits GH-063/064/066), GH-076 and
  GH-077 (reference apps, await GH-075).
