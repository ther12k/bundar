# GH-065 verification transcript — page-versus-fragment error negotiation

## Issue

[GH-065 — Implement page-versus-fragment error
negotiation](../../issues/m4/gh-065-implement-page-versus-fragment-error-negotiation.md)
(branch `gh-065-error-negotiation`, worktree `bundar-gh-065`, base commit
`a76d0b1` = main after the GH-050 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` (@bundar/jsx only), pinned profiles htmx `2.0.10`
  / `4.0.0-beta6` (never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/error-view.ts` (new): error PRESENTATION separated
  from classification — `ErrorPresentationPolicy` (renderDocument required;
  renderFragment / renderModalRegion optional; `renderAuthFragment` as the
  deliberate 401/403 opt-in; server-known `fragmentTarget` only),
  `PublicErrorView` (status/code/message + optional GH-059 fieldErrors +
  correlation id), `errorViewResponse()` choosing the mode: documents for
  ordinary navigation (through jsx's `page()` — doctype + single html
  root), fragments/modal-regions/empty for enhanced requests, with
  retarget hints from the SERVER policy only (client HX-Target is display
  context, never authorization), `errorSwapMode()` reading the pinned
  profiles (v2 target-swap default; v4 no-swap — the composer adds an
  explicit reswap under v4 so fragments actually render), all error
  responses `private, no-store` with the negotiation Vary, and escaped
  output. `validationErrorView()` + `renderValidationErrorFragment()` wire
  GH-059 field-error models into the standard summary region.
- Tests: `packages/htmx/test/error-negotiation/error-view.test.ts` (14) —
  mode selection per request kind/status, hostile HX-Target ignored,
  modal-region rendering, empty fallback, 401/403 document-path safety
  (protected fragment content never served), dialect swap differences with
  exact header assertions, header policy, markup-injection escaping,
  correlation-id non-disclosure, helper contracts.
- Browser lanes: `/error-validation` (422 with the GH-059 summary) and
  `/error-forbidden` (403 with a deliberately "secret" fragment renderer)
  routes; an `error-negotiation` scenario hard-asserted in BOTH lanes:
  enhanced 422 serves the field-error fragment retargeted to the
  server-known region (hostile client target ignored); ordinary 422
  receives a full-page document; enhanced 403 receives the DOCUMENT (no
  `secret-fragment` anywhere); ordinary 403 the document.
- `packages/htmx/README.md`: error negotiation section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/error-negotiation/**` (as
   `bun test ./packages/htmx/test/error-negotiation`) — exit 0; 14 tests,
   32 expect() calls, 0 fail.
3. `bun run test:browser:htmx2` / `htmx4` — exit 0; the error-negotiation
   scenario passed in both lanes (`output/playwright/*/errors.json`).
4. `bun run --filter @bundar/htmx typecheck` and root `bun run typecheck` —
   exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 560 tests across 68 files, 0 fail, 7,576
   expect() calls.
7. `bun run architecture:check` — exit 0 (65 source files). `bun run
   pack:inspect @bundar/htmx` — exit 0. `bun run build` — exit 0.
   `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) —
   exit 0.

### Tooling decisions

- The planned `test:browser:dual -- errors` and `test:browser:no-js --
  errors` runners do not exist; the error scenario runs in BOTH existing
  lanes with hard assertions, and the ordinary-browser (no-JS) behavior is
  asserted inside the same scenario via the non-enhanced fetches (full-page
  documents). Dual-lane + no-JS coverage in one substitution, matching the
  established pattern.

## Acceptance evidence mapping

- "A 422 form error updates the intended region in both lanes" — enhanced
  422 fragment + `hx-retarget: #error-target` (server-known) in both lanes;
  unit tests assert the region content and the GH-059 summary rendering.
- "A 401/403 flow cannot expose protected fragment content" — the safety
  rule is deliberate: auth failures take the document path unless the app
  explicitly provides `renderAuthFragment`; browser scenario proves the
  "secret" fragment never reaches an enhanced 403.
- "An unexpected 500 returns a safe full-page or fragment response and logs
  correlation data" — 500 fragment test renders the envelope message with
  the correlation id absent from the body (handlers log it; GH-020's
  boundary keeps internals out).
- "Normal browser behavior remains usable" — ordinary (non-enhanced)
  requests receive doctype-valid full error documents in every scenario.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — htmx README, closure record, `issues/m4/index.md`,
  `log.md`, this transcript.

## Residual risks

- Apps opting into `renderAuthFragment` own the consequence of what their
  auth-error fragments expose (documented; the default is the safe
  document path).
- The v4 no-swap compensation (explicit `reswap`) follows the beta
  profile's documented behavior; GA revalidation (GH-089+) must re-check it.
- Branded error designs remain application territory (out of scope by
  design).

## Newly unblocked

- GH-068 (forms and security test matrix) — another of its dependencies
  complete (GH-060/063/064/066 remain).
