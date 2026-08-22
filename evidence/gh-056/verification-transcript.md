# GH-056 verification transcript — M3 zero-handler-change dialect-switch gate

## Issue

[GH-056 — Run the M3 zero-handler-change dialect-switch
gate](../../issues/m3/gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md)
(branch `gh-056-m3-gate`, worktree `bundar-gh-056`, base commit `26d5791` =
main after the GH-055 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0`, pinned profiles: **htmx `2.0.10`** (SHA-256
  `71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de`) and
  **htmx `4.0.0-beta6`** (SHA-256
  `28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25`) —
  never claimed GA.
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `scripts/m3-gate.ts` (new) + `package.json` script `ci:m3`: ordered,
  fail-closed 45-step battery — a strict superset of `ci:m2` (37 steps)
  adding `htmx:source-diff` (dialect-conditional guard), `test:dual-app`
  (both-lane browser parity from unchanged source), `conformance:report`
  for htmx2 and htmx4-beta6, and the `security:cache` / `security:uploads` /
  `security:redirects` audits.
- `examples/dual-dialect-fixture/package.json` (new): workspace manifest
  required by `docs:check`.
- `delivery/gates/m3.md` (new) + `delivery/index.md` entry: the M3 gate
  record (required dependencies, toolchain, battery, acceptance findings,
  frozen migration contract, authorization, residual risks).
- `docs/compatibility/matrix.md` (new): side-by-side htmx 2 vs htmx 4
  compatibility matrix with provisional annotations.
- This transcript.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun run docs:check` — exit 0 (after adding the example's package.json).
3. `bun run ci:m3` — **exit 0; all 45 required steps passed.** Key M3-only
   additions:
   - `htmx:source-diff`: 1 application file verified zero dialect
     conditionals, no raw protocol strings.
   - `test:dual-app`: identical results in both lanes
     (`counter="1 item", listItems=1, nav="/items", error="Field is
     required"`).
   - `conformance:report htmx2` and `htmx4-beta6`: both published.
   - `security:cache`, `security:uploads`, `security:redirects`: all green.
   - All 5 package inspections (core, jsx, schema, security, htmx).
   - Both browser lanes + `test:browser:jsx` + `test:dual-app`.
4. `bun run htmx:source-diff` (standalone planned command) — exit 0.
5. `bun run architecture:check` (standalone planned command) — exit 0
   (74 source files, 8 package rules).
6. `bun run docs:validate` / `docs:links` after adding the gate record and
   this transcript — exit 0.

### Tooling decisions

- The planned `conformance:compare` is satisfied by `test:dual-app` which
  runs both lanes and produces a machine-readable parity summary
  (`output/playwright/dual/dual-summary.json`); plus the two
  `conformance:report` publications inside the battery.
- `ci:m3` and `htmx:source-diff` were added verbatim.

## Acceptance evidence mapping

- "Shared application source passes both stable-subset lanes" —
  `test:dual-app` in the battery: identical browser behavior from
  `examples/dual-dialect-fixture/app.ts` under both dialects.
- "No raw header parsing exists outside adapters" — architecture check
  (74 files, 8 rules) confines `HX-*`/`htmx:*` strings to @bundar/htmx;
  `htmx:source-diff` catches raw protocol strings in application code.
- "No core/JSX dependency on htmx exists" — pack:inspect for core and jsx
  (zero runtime dependencies); frozen boundary rules forbid the edge.
- "Documentation never labels beta support as GA" —
  `docs/compatibility/htmx4-beta6.md` carries `[provisional]`; the
  conformance report disclaims GA; `docs/compatibility/matrix.md` marks
  htmx 4 as experimental with mandatory M7 GA revalidation.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — all 45 steps exit 0; nothing skipped.
- OKF/log updates — gate record + delivery index, compatibility matrix,
  closure record, `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks and deviations

- Carried from the M3 chain: htmx 4 beta's error-swap default difference
  (fixture uses fetch-based error checks while main lanes verify
  dialect-specific DOM behavior); GA revalidation mandatory (M7);
  `raw(oobHtml)` trust boundary for OOB composition (GH-031 contract).
- One mid-gate stop: `docs:check` required the example's package.json —
  fixed and the full battery re-run from step 1 (nothing skipped).

## Newly unblocked / authorization

- GH-071 (create-bundar scaffolding; also requires M4's GH-069) and GH-079
  (API reference; also requires GH-069 and GH-073 complete). **The M3
  milestone is closed.** No GA compatibility claim for htmx 4 is made.
