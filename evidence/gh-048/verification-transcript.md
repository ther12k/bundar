# GH-048 verification transcript — full-page and fragment negotiation

## Issue

[GH-048 — Implement full-page and fragment
negotiation](../../issues/m3/gh-048-implement-full-page-and-fragment-negotiation.md)
(branch `gh-048-negotiation`, worktree `bundar-gh-048`, base commit
`ca94b83` = main after the GH-025 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/jsx `0.0.0` (workspace dependency — the first htmx workspace edge,
  explicitly allowed by the frozen ADR-0016 boundary rules).
- htmx profiles exercised through the browser lanes: `2.0.10` (stable) and
  `4.0.0-beta6` (experimental; never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/view.ts` (new): `view()` and `negotiateView()` +
  `VIEW_VARY_HEADERS` + `ViewDefinitionError`. Negotiation rules: normal →
  document; standard enhanced (`HX-Request`) → fragment; boosted → document
  (htmx swaps the `<body>` out of a full page); history restore → document
  (restored cache entries must be installable as pages). Documents render
  through the JSX page helper (doctype + single `<html>` root enforced);
  fragments render bare. Every response carries
  `Vary: HX-Request, HX-Boosted, HX-History-Restore-Request`; user `Vary`
  composes. `negotiateView()` is pure so cache/history policy (GH-049) keys
  on the exact rule the renderer used.
- `packages/htmx/src/index.ts`: view exports; boundary comment updated (jsx
  is now the one allowed workspace dependency).
- `packages/htmx/package.json`: `"dependencies": { "@bundar/jsx":
  "workspace:*" }` (allowed by boundaries.json; `pack:inspect @bundar/htmx`
  still passes and the architecture check is green).
- `packages/htmx/test/render-negotiation/view.test.ts` (new): 18 tests.
- Root `tsconfig.json`: added the `@bundar/jsx` path so tools/tests resolve
  the workspace package like core/htmx.
- Browser harness: `tests/browser/server.ts` gained a `/page-fragment` route
  implemented with `view()` (no raw header reads); the fixture page gained a
  boosted link; `tests/browser/run.ts` asserts the four representations via
  fetch in both lanes and exercises a real boosted navigation through htmx.
- `packages/htmx/README.md`: negotiation section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test ./packages/htmx/test/render-negotiation` — exit 0; 18 tests,
   41 expect() calls, 0 fail.
3. `bun run test:browser:htmx2` — exit 0 (includes the new
   `page-fragment-negotiation` and `boosted-navigation` scenarios;
   `negotiation.json` shows docIsDocument/fragIsFragment/boostedIsDocument/
   restoreIsDocument all true and the exact Vary string;
   `boosted-state.json` shows url `/page-fragment`, itemsHeading `Items`,
   1 html root, 1 body).
4. `bun run test:browser:htmx4` — exit 0 (same assertions; the experimental
   lane also observed a correct boosted body swap — recorded as observation,
   hard assertion remains the stable lane per the GH-008 lane policy).
5. `bun run test:browser:report` — exit 0 (report.json for both lanes now
   includes the `negotiation` and `boostedNavigation` records).
6. `bun run pack:inspect @bundar/htmx` / `@bundar/jsx` — exit 0.
7. `bun run architecture:check` — exit 0 (47 source files, 7 package rules;
   htmx→jsx allowed edge, no raw HX strings outside @bundar/htmx).
8. `bun run format:check`, `bun run lint`, `bun run typecheck`, `bun run
   --filter @bundar/htmx typecheck` — exit 0.
9. `bun test` — exit 0; 370 tests across 46 files, 0 fail, 2,968 expect()
   calls.
10. `bun run build` — exit 0. `bun run docs:validate` (210 documents) and
    `bun run docs:links` (1,088 links) — exit 0. `bun run bench:parity` —
    exit 0 (9 scenarios).

### Tooling decision (planned-command substitution)

The issue's planned `bun run test:browser:dual -- page-fragment` does not
exist as a separate dual runner; the dual-dialect fixture is GH-055's
deliverable. Equivalent-or-stronger evidence: the negotiation scenarios were
added to BOTH existing browser lanes (`test:browser:htmx2` and
`test:browser:htmx4`), so the same `view()` code is proven against htmx
2.0.10 and 4.0.0-beta6 in a real browser, plus 18 in-process unit tests.
The suggested `examples/fixtures/page-fragment/**` directory was not created:
the dual-dialect fixture app (`fixtures/cross-dialect-app`) already serves
this role for both lanes, which is stronger than a single-dialect fixture.

## Acceptance evidence mapping

- "The same handler returns a complete document to a normal browser and
  fragment to HTMX" — unit tests (document/fragment for one definition) and
  the browser `negotiation-fetch` assertions in both lanes.
- "History restore does not accidentally install a fragment as a document" —
  unit test (history-restore → doctype + single html root) and browser fetch
  assertion `restoreIsDocument: true` in both lanes.
- "No handler reads raw HTMX headers" — the fixture `/page-fragment` handler
  calls only `view(request, …)`; raw `HX-*` strings remain confined to
  @bundar/htmx (architecture check green).
- "No-JS navigation remains valid HTML and usable" — document path test
  (doctype, single `<html>`, title, inline fragment content) plus the real
  browser navigation assertions.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0, nothing skipped; the
  htmx 4 lane keeps the established experimental-observation classification
  for the DOM-level boosted swap (the server-side negotiation assertions are
  hard in both lanes).
- OKF/log updates — issue closure record, `issues/m3/index.md`, `log.md`,
  htmx README, this transcript.

## Residual risks and deviations

- @bundar/htmx now depends on @bundar/jsx (first htmx workspace edge). This
  is explicitly permitted by the frozen ADR-0016 rules and enforced by the
  architecture check; @bundar/jsx itself keeps zero runtime dependencies.
- Boosted-navigation DOM behavior on the htmx 4 beta lane is recorded as an
  observation (it passed here); the hard cross-lane guarantee is the
  server-side negotiation, which is dialect-independent.
- `Vary` uses canonical wire header names; if a future dialect renames the
  boosting/history headers, the decoder aliases cover reading but the Vary
  string must be revisited with that dialect's profile.

## Newly unblocked

- GH-049 (cache variation and history safety policy — consumes
  `negotiateView` and the vary inputs), GH-050 (progressive action response
  composer), GH-053/GH-054 (browser conformance profiles), GH-065 (page vs
  fragment error negotiation).
