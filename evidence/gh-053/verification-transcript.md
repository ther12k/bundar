# GH-053 verification transcript — HTMX 2 browser conformance profile

## Issue

[GH-053 — Close the HTMX 2 browser conformance profile](../../issues/m3/gh-053-close-the-htmx-2-browser-conformance-profile.md)
(branch `gh-053-htmx2-conformance`, worktree `bundar-gh-053`, base commit `8d44d4b` = main after the GH-052 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0`, pinned dialect profile **htmx `2.0.10`** (SHA-256: `71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de`).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `tests/browser/conformance-report.ts` (new) + `conformance:report` script: extracts and publishes machine-readable conformance report to `artifacts/conformance/htmx2.json`.
- `artifacts/conformance/htmx2.json` (new, published): records the 19 verified browser scenarios under htmx 2.0.10:
  - `smoke-page`
  - `fragment-swap`
  - `form-post`
  - `history-push`
  - `incorrect-header-negative` (fail-closed check)
  - `page-fragment-negotiation` (exact Vary on both representations)
  - `boosted-navigation` (full document body swap)
  - `history-restore` (back/forward document restore)
  - `action-fallback` (303 PRG vs 200 fragment + trigger)
  - `error-negotiation` (422 region update + server-known retarget; 403 document path)
  - `validated-form` (422 on invalid, 200/303 on valid)
  - `multi-region` (OOB counter replace + list append)
  - `asset-serving` (200 with immutable cache, 304 on If-None-Match)
  - `inheritance-disinherit` (`hx-disinherit` attributes)
  - `navigation-adaptive` (303 Location vs 200 HX-Redirect)
  - `csrf-form-flow`, `csrf-header-flow`, `csrf-rejection`
  - `session-lifecycle` (login-rotate, whoami, logout)
- `docs/compatibility/htmx2.md` (new): compatibility profile document covering verified capabilities, offline asset serving, and explicitly unsupported features (`hx-vals js:`).

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun run test:browser:htmx2` — exit 0; 19 scenarios passed.
3. `bun run conformance:report -- htmx2` — exit 0; published `artifacts/conformance/htmx2.json`.
4. `bun run typecheck`, `--filter @bundar/htmx typecheck` — exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 635 tests across 76 files, 0 fail, 7,784 expect() calls.
7. `bun run architecture:check` — exit 0 (74 source files).
8. `bun run pack:inspect @bundar/htmx` — exit 0.
9. `bun run build` — exit 0.
10. `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) — exit 0.

## Acceptance evidence mapping

- "Every mandatory htmx 2 profile capability has a passing scenario" — 19 passing browser scenarios recorded in `artifacts/conformance/htmx2.json`.
- "No test uses CDN-latest assets" — local verified bundled assets used exclusively.
- "No-JS fallback scenarios pass independently" — ordinary form submits, redirects, and document errors verified.
- "The exact browser and htmx versions are recorded" — Chrome for Testing 152.0.7977.8 and htmx 2.0.10 recorded in transcript, conformance report, and compatibility docs.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record, `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks

- None identified for htmx 2.0.10.

## Newly unblocked

- Contributes to GH-055 (unchanged-source dual-dialect reference fixture; awaits GH-054).
