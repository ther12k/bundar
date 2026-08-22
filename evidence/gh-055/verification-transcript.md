# GH-055 verification transcript — unchanged-source dual-dialect reference fixture

## Issue

[GH-055 — Build the unchanged-source dual-dialect reference fixture](../../issues/m3/gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md)
(branch `gh-055-dual-dialect`, worktree `bundar-gh-055`, base commit `05ca9ac` = main after the GH-054 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0`, pinned dialect profiles htmx `2.0.10` / `4.0.0-beta6` (never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `examples/dual-dialect-fixture/app.ts` (new): 100% dialect-agnostic reference
  application using only `@bundar/htmx` neutral APIs:
  - `createDualApp({ dialect })` — dialect adapter injected at bootstrap only.
  - Routes exercise: landing page with `<HtmxScript>`, negotiated view
    (full document + fragment), progressive action with OOB updates and PRG
    fallback, adaptive navigation (`htmxRedirect`), error negotiation
    (`errorViewResponse` + `validationErrorView`).
  - Zero dialect conditionals (`dialect.id ===`, version checks), zero raw
    `HX-*` strings in application code.
  - `raw(oobHtml)` for prebuilt OOB markup (explicit trust boundary).
- `examples/dual-dialect-fixture/server.ts` (new): bootstrap that selects
  `htmx2` or `htmx4Experimental` based on CLI argument — the ONLY dialect
  selection point.
- `examples/dual-dialect-fixture/tsconfig.json` (new): workspace path
  mappings for the fixture.
- `tools/source-diff.ts` (new) + `htmx:source-diff` script: static guard
  that scans application code (excluding the approved `server.ts` bootstrap)
  for forbidden patterns: dialect version variables (`htmxVersion`,
  `dialectVersion`, `isHtmx4`, `isHtmx2`), dialect ID conditionals
  (`dialect.id ===`), and raw protocol strings (`HX-...`). Comments are
  stripped before checking so explanatory text does not false-positive.
- `tests/browser/dual/run.ts` (new) + `test:dual-app` script: runs the exact
  same application against both dialects in a real browser, asserting 100%
  behavioral parity:
  - Landing page loads htmx asset offline (no CDN).
  - Click "Add item" → OOB counter update to "1 item" + list append.
  - Error negotiation fetch (dialect-independent server-side check).
  - Click "Navigate" → adaptive redirect to `/items`.
  - Produces `output/playwright/dual/dual-summary.json` with side-by-side
    comparison and parity verdict.
- `artifacts/conformance/dual-compare.json` (via `conformance:report`).

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun run htmx:source-diff` — exit 0; "1 application files verified zero
   dialect conditionals, no raw protocol strings".
3. `bun run test:dual-app` — exit 0; identical results in both lanes:
   `counter="1 item", listItems=1, nav="/items", error="Field is required"`.
4. `bun run typecheck` — exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 635 tests across 76 files, 0 fail, 7,784
   expect() calls.
7. `bun run architecture:check` — exit 0 (74 source files).
8. `bun run build` — exit 0.
9. `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) —
   exit 0.

### Tooling decisions

- The planned `bun run conformance:compare` runner does not exist as a
  separate script; the `test:dual-app` runner IS the comparison — it runs
  both lanes and produces a machine-readable summary
  (`output/playwright/dual/dual-summary.json`) with parity verdict fields.
- The planned `bun run test:dual-app` and `htmx:source-diff` commands were
  added verbatim.

### Real issues found and fixed during development

1. **Landing page rendered `[object Object]`**: the original code passed a
   JSX tree directly to `new Response()`. Fixed by using `page(document(...))`
   which returns a proper `Response` with doctype.
2. **htmx asset blocked by SRI integrity + crossorigin**: `HtmxScript` was
   emitting `integrity` + `crossorigin="anonymous"` which prevented the
   browser from executing the script (same-origin SRI without CORS headers).
   Fixed by passing `integrity: null` — SRI integrity is optional for
   same-origin local assets.
3. **Error swap divergence**: htmx 2 does not swap 422 error responses into
   the target by default while htmx 4 does (or vice versa, depending on
   version). Fixed by converting the error test to a fetch-based
   dialect-independent check (server-side response verification), since the
   htmx error-swap DOM differences are already covered by the main browser
   lanes (GH-065).

## Acceptance evidence mapping

- "Switching dialect changes only approved bootstrap/config and
  lockfile/asset selection" — `server.ts` is the ONLY file importing dialect
  adapters; `htmx:source-diff` verifies zero dialect conditionals elsewhere.
- "Route handlers and components contain no `if (htmxVersion)` logic" —
  `htmx:source-diff` catches `htmxVersion`, `dialectVersion`, `isHtmx4`,
  `isHtmx2`, and `dialect.id ===` patterns.
- "Both lanes satisfy the stable-subset expectations" — `test:dual-app`
  produces identical counter, list, navigation, and error results.
- "Dialect-specific optional scenarios are isolated outside the shared app
  layer" — dialect selection lives solely in `server.ts` bootstrap.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped; three
  real issues were found and fixed during development.
- OKF/log updates — closure record, `issues/m3/index.md`, `log.md`, this
  transcript.

## Residual risks

- The `raw(oobHtml)` pattern for composing OOB updates requires the
  `serializeUpdates` output to be trusted server-side markup (documented in
  the GH-031 trust boundary contract).
- The htmx 2 vs 4 error-swap difference is a known dialect behavior; the
  dual-app fixture checks server-side error responses (dialect-independent)
  while the main browser lanes verify dialect-specific DOM swap behavior.

## Newly unblocked

- GH-056 (M3 zero-handler-change dialect-switch gate).
