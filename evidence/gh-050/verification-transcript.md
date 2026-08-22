# GH-050 verification transcript — progressive action response composer

## Issue

[GH-050 — Implement the progressive action response
composer](../../issues/m3/gh-050-implement-the-progressive-action-response-composer.md)
(branch `gh-050-action-composer`, worktree `bundar-gh-050`, base commit
`b5d919b` = main after the GH-049 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` (depends on @bundar/jsx only — ADR-0016), pinned
  dialect profiles htmx `2.0.10` / `4.0.0-beta6` (never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/action.ts` (new): `action()` builds and validates the
  action result AT HANDLER TIME — before any response commits: fragment
  required; fallback redirect required unless `noFallbackRedirect: true`
  explicitly opts the route out; conflicting fields
  (`noFallbackRedirect` + `redirectTo`, `redirectStatus` without
  `redirectTo`) throw `ActionDefinitionError`; redirect statuses restricted
  to the approved set (303 default; 301/302/307/308); body statuses
  restricted to 200/201/202/422 (204 excluded — a fragment body is
  mandatory). `actionResponse(request, result, { dialect? })` composes:
  enhanced submissions → the rendered fragment with directives applied
  (GH-042 encoder), the negotiation Vary (GH-048), and the fail-safe cache
  policy (GH-049, private option); ordinary submissions → the PRG
  redirect; boosted/history-restore requests follow the document path and
  receive the redirect like ordinary navigations; opt-out routes serve the
  fragment plainly. String fragments ESCAPE as text — markup requires a
  JSX tree or the explicit `raw()` boundary (GH-031 trust model preserved).
  The composer owns only response composition; business logic stays in the
  handler.
- Tests: `packages/htmx/test/actions/action.test.ts` (15) — validation
  matrix, both composition paths, status sets, cache/vary headers, string
  vs tree vs raw semantics, boosted fallback, dialect decoding.
- Browser lanes: `/action-save` fixture route through `actionResponse`; a
  new `action-fallback` scenario in BOTH lanes asserting in a real browser:
  the ordinary POST is a redirect (opaque-redirect type with
  `redirect: manual`; the followed fetch lands on the PRG target's
  document), and the enhanced POST returns the fragment HTML with the
  trigger header and Vary.
- `packages/htmx/README.md`: actions section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/actions/**` (as
   `bun test ./packages/htmx/test/actions`) — exit 0; 15 tests, 31 expect()
   calls, 0 fail.
3. `bun run test:browser:htmx2` / `htmx4` — exit 0; the action-fallback
   scenario passed in both lanes (`output/playwright/*/action-fallback.json`).
4. `bun run --filter @bundar/htmx typecheck` and root `bun run typecheck` —
   exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 546 tests across 67 files, 0 fail, 7,544
   expect() calls.
7. `bun run architecture:check` — exit 0 (64 source files). `bun run
   pack:inspect @bundar/htmx` — exit 0. `bun run build` — exit 0.
   `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) —
   exit 0.

### Tooling decisions

- The planned `bun run test:browser:dual -- action-fallback` runner does
  not exist; the scenario runs in BOTH existing lanes with hard assertions
  in each (dual-lane substitution, established pattern). Browsers hide
  manual-redirect details (opaque responses), so the browser proof uses
  the opaque-redirect type plus the followed navigation landing on the PRG
  target document; the exact 303 + Location are asserted at the unit
  level.

## Acceptance evidence mapping

- "Ordinary form submission receives an approved redirect status and
  location" — unit tests across the full approved set with exact Location;
  browser lane proves the redirect + followed document.
- "Enhanced submission receives HTML/directives without requiring a JSON
  API" — fragment HTML + `hx-trigger` header assertions (unit + real
  browser).
- "A missing fallback redirect fails validation unless route explicitly
  opts out" — `ActionDefinitionError` tests for the missing case and the
  explicit `noFallbackRedirect` escape.
- "Conflicting action fields produce a compile/runtime diagnostic before
  response commit" — both conflict forms throw in `action()`, which runs
  before composition.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — htmx README actions section, closure record,
  `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks

- String fragments escape as text by design; handlers must use JSX trees
  or `raw()` for markup (documented; the trust boundary stays explicit).
- The htmx 4 beta lane observes rather than hard-asserts DOM-level swaps
  per the established policy — though the action scenario (server-side
  composition) is hard-asserted in both lanes.
- Directive header values follow GH-042's deterministic JSON event
  encoding; apps parsing raw headers must use that contract.

## Newly unblocked

- GH-051, GH-052, GH-053, GH-054 (M3 chain) and GH-060 (progressive
  validated form actions, M4).
