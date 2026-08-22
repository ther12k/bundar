# GH-054 verification transcript — HTMX 4 beta browser conformance profile

## Issue

[GH-054 — Close the HTMX 4 beta browser conformance profile](../../issues/m3/gh-054-close-the-htmx-4-beta-browser-conformance-profile.md)
(branch `gh-054-htmx4-conformance`, worktree `bundar-gh-054`, base commit `67d8ce9` = main after the GH-053 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0`, pinned experimental dialect profile **htmx `4.0.0-beta6`** (SHA-256: `28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25`).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `tests/browser/conformance-report.ts`: updated to accept `htmx4-beta6` / `htmx4`, producing `artifacts/conformance/htmx4-beta6.json` and `artifacts/conformance/htmx4.json` with explicit `experimental-provisional` status and mandatory GA revalidation disclaimer.
- `artifacts/conformance/htmx4-beta6.json` (new, published): records the 19 verified experimental browser scenarios under htmx 4.0.0-beta6:
  - `smoke-page`
  - `fragment-swap`
  - `form-post`
  - `history-push`
  - `incorrect-header-negative` (fail-closed check)
  - `page-fragment-negotiation` (exact Vary on both representations)
  - `boosted-navigation` (full document body swap)
  - `history-restore` (back/forward document restore)
  - `action-fallback` (303 PRG vs 200 fragment + trigger)
  - `error-negotiation` (422 region update with explicit reswap; 403 document path)
  - `validated-form` (422 on invalid, 200/303 on valid)
  - `multi-region` (OOB counter replace + list append)
  - `asset-serving` (200 with immutable cache, 304 on If-None-Match)
  - `inheritance-disinherit` (`hx-disinherit` attributes)
  - `navigation-adaptive` (303 Location vs 200 HX-Redirect)
  - `csrf-form-flow`, `csrf-header-flow`, `csrf-rejection`
  - `session-lifecycle` (login-rotate, whoami, logout)
- `docs/compatibility/htmx4-beta6.md` (new): experimental compatibility guide detailing verified capabilities, provisional findings, and mandatory GA revalidation in M7.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun run test:browser:htmx4` — exit 0; 19 scenarios passed.
3. `bun run conformance:report -- htmx4-beta6` — exit 0; published `artifacts/conformance/htmx4-beta6.json`.
4. `bun run typecheck`, `--filter @bundar/htmx typecheck` — exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 635 tests across 76 files, 0 fail, 7,784 expect() calls.
7. `bun run architecture:check` — exit 0 (74 source files).
8. `bun run pack:inspect @bundar/htmx` — exit 0.
9. `bun run build` — exit 0.
10. `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) — exit 0.

## Acceptance evidence mapping

- "The report clearly says beta/experimental" — `artifacts/conformance/htmx4-beta6.json` sets `status: "experimental-provisional"` and carries the explicit disclaimer.
- "Shared scenarios use the same server application source as v2" — single `tests/browser/server.ts` fixture runs both lanes without handler code duplication.
- "Known beta differences are not hidden with blanket skips" — differences (error swap, header alias, inheritance) are modeled in profile metadata and tested.
- "The exact browser and htmx versions are recorded" — Chrome for Testing 152.0.7977.8 and htmx 4.0.0-beta6 recorded in transcript, conformance report, and compatibility docs.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record, `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks

- HTMX 4 is beta/experimental; GA revalidation is required in M7 before any GA release claims.

## Newly unblocked

- Contributes to GH-055 (unchanged-source dual-dialect reference fixture; now fully unblocked!).
