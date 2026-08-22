# GH-025 verification transcript — M1 HTTP-core gate

## Issue

[GH-025 — Run and record the M1 HTTP-core gate](../../issues/m1/gh-025-run-and-record-the-m1-http-core-gate.md)
(branch `gh-025-m1-http-core-gate`, worktree `bundar-gh-025`, base commit
`1317a9b` = main after the GH-024 merge; gate commit recorded below).

## Environment (exact versions)

- Bun `1.4.0` (`packageManager: bun@1.4.0`; preflight enforces the minimum).
- TypeScript `6.0.3`, ESLint `10.8.1`, Prettier `3.9.6`.
- Hono baseline `4.13.3` (benchmark parity only).
- Browser harness: Chrome for Testing `152.0.7977.8`, Playwright Chromium
  `1237`; htmx profiles `2.0.10` (stable) and `4.0.0-beta6` (experimental,
  never claimed GA).
- @bundar/core `0.0.0` (61 runtime exports, 0 type-only exports),
  @bundar/jsx `0.0.0`, @bundar/htmx `0.0.0`, @bundar/cli `0.0.0` (workspace
  dependency on core approved in GH-070).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs (13th Gen Intel Core i5-13420H).

## What changed

- `scripts/m1-gate.ts` (new) + `package.json` script `ci:m1`: ordered,
  fail-closed 28-step M1 gate battery (strict superset of `ci:m0`: adds the
  type-level test suite, core contract matrix, the three external type
  consumers, the routes snapshot check, the API snapshot check, package
  inspections for core and jsx, the raw-HTML security audit, the committed
  M1 performance artifact tolerance check, and both browser lanes).
- `tools/api-check.ts` (new) + `package.json` script `api:check`: byte-compares
  the committed `artifacts/api/core.md` snapshot against the live
  `@bundar/core` public surface and fails closed with the first divergent
  line; `tools/api-report.ts` was refactored to export its renderer (same
  output — re-running `api:report` produced no diff).
- `delivery/gates/m1.md` (new) + `delivery/index.md` entry: the M1 gate record
  (required dependencies, toolchain profile, battery, reviewed M0 deviations,
  acceptance findings, authorization, residual risks).
- This transcript.

## Exact commands and exit statuses

Run on the final code state in the worktree root:

1. `bun install --frozen-lockfile` — exit 0 (no dependency changes).
2. `bun run api:check` — exit 0; `artifacts/api/core.md matches the public
   surface (61 runtime + 0 type exports)`.
3. `bun run ci:m1` — **exit 0; all 28 required steps passed**. Key lines:

   - `preflight`, `format:check`, `lint`, `typecheck`, `test:types` — exit 0.
   - `docs:validate: ok (209 documents, 96 issues …)`; `docs:links: ok (1063
     links across 209 documents)`; `issues:graph`; `docs:check` — exit 0.
   - architecture tests (13 tests) and
     `architecture:check: ok (46 source files, 7 package rules enforced)` —
     exit 0 (no second router; no forbidden package edge; jsx→core absent;
     raw HX strings confined to @bundar/htmx).
   - `bench:smoke` and `bench:parity: 9 scenarios passed raw Bun/Hono/Bundar
     parity checks` — exit 0.
   - `bench:report artifacts/bench/m1.json` — exit 0;
     `static fast path within tolerance: 0.65× raw-bun p50 ≤ 2.00× reviewed
     ceiling` (performance evidence reviewed against the committed artifact).
   - core contract matrix — 42 tests across 6 files, exit 0.
   - core type consumer (9 tests), JSX type consumer (`tsc --noEmit`), routes
     consumer (6 tests) — exit 0.
   - `routes:check: tests/consumer/routes/routes.gen.ts is up to date` — exit 0.
   - `pack:inspect @bundar/core` and `pack:inspect @bundar/jsx` — exit 0
     (allow-listed files, zero runtime dependencies).
   - `security:raw-html-audit` — exit 0.
   - `browser:htmx2` / `browser:htmx4` — "smoke and interaction scenarios
     passed; negative fixture failed as expected"; `browser:report: 2 lanes
     recorded in evidence/gh-008/report.json` — exit 0.
   - full `bun test` — 352 tests across 45 files, 0 fail — exit 0.
   - `build` — exit 0.

   Full ordered log: each step printed `[m1] <name>: exit 0` and the final
   line `[m1] all 28 required steps passed`. (One earlier gate run stopped at
   `format:check` because `scripts/m1-gate.ts` itself was unformatted; the
   file was formatted and the battery re-run end-to-end — no step was skipped
   or reordered.)

4. `bun run docs:validate` / `bun run docs:links` after adding the gate doc
   and this transcript — exit 0.
5. `bun run format:check` — exit 0.

## Acceptance evidence mapping

- "No second router or forbidden package edge exists" — architecture check +
  architecture unit tests in the battery; routing compiles to `Bun.serve`
  native route tables only.
- "All core tests and package inspections pass" — 352/352 repository tests,
  42-test contract matrix, three external type consumers, `pack:inspect` for
  core and jsx all exit 0.
- "Performance evidence is reviewed" — the GH-024 artifact is re-checked
  inside the battery (`bench:report` tolerance pass) and the review is
  recorded in `delivery/gates/m1-performance.md`.
- "Any public API exception has an ADR and migration note" — none exist; the
  reviewed deviations (CLI workspace dependency from GH-070; benchmark schema
  1→2; new tooling scripts) are recorded in `delivery/gates/m1.md` with no
  public-API impact.
- "Exact verification commands, environment versions, and evidence locations
  attached" — this transcript + the gate record.
- "No mandatory test failure is hidden, skipped without reason, or converted
  into a warning" — every step exit 0; the single mid-run stop
  (format:check) was fixed and the whole battery re-run from step 1.
- "Relevant OKF concepts, compatibility notes, and changelog/log entries
  updated in the same change" — `delivery/gates/m1.md` (new),
  `delivery/index.md`, issue closure record, `issues/m1/index.md`, `log.md`.

## Residual risks and deviations

- Carried from GH-024: single-machine benchmark variance; in-process dispatch
  substitution; `cpuModel` not portable via Bun API.
- `request.params` depends on Bun's documented route-handler contract; a
  breaking Bun major is detected by the contract matrix rather than
  prevented.
- Production error opacity depends on `NODE_ENV` configuration at deploy
  time (pinned by tests; operational risk documented in GH-020 evidence).
- Browser lanes are harness smokes at this milestone (full conformance
  profiles are M3's GH-053/GH-054); they are included for parity with
  `ci:m0`, not as JSX/HTMX release claims.

## Newly unblocked / authorization

- M2: GH-034 (renderToStream) and GH-035 (typed common HTMX attributes) are
  immediately unblocked; then GH-036, GH-037, GH-038.
- M3: GH-045, GH-046, GH-047, GH-048 (and their dependents GH-049–056) are
  authorized on this foundation.
- No JSX or HTMX release claim is made by this gate.
