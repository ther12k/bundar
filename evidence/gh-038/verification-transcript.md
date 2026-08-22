# GH-038 verification transcript — M2 server-JSX gate

## Issue

[GH-038 — Run and record the M2 server-JSX
gate](../../issues/m2/gh-038-run-and-record-the-m2-server-jsx-gate.md)
(branch `gh-038-m2-gate`, worktree `bundar-gh-038`, base commit `45fa6c0` =
main after the GH-037 merge; gate commit recorded below).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3` (TSX via react-jsx + jsxImportSource
  "@bundar/jsx"); ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/core `0.0.0` (71 exports), @bundar/jsx `0.0.0` (zero runtime
  dependencies), @bundar/schema `0.0.0` (core only), @bundar/security
  `0.0.0` (core only, ADR-0017).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`
  (htmx lanes use 2.0.10 stable / 4.0.0-beta6 experimental; never claimed
  GA).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `scripts/m2-gate.ts` (new) + `package.json` script `ci:m2`: ordered,
  fail-closed 37-step battery — a strict superset of `ci:m1` adding the
  schema type consumer, all five security audits, the browser DOM
  comparison lane, and read-only verification of the committed M2
  performance artifact.
- `delivery/gates/m2.md` (new) + `delivery/index.md` entry: the gate record
  (required dependencies, toolchain, battery, reviewed raw-HTML policy and
  streaming limitations, approved public surface, authorization, residual
  risks).
- This transcript.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun run ci:m2` — **exit 0; all 37 required steps passed**. Key lines
   (full log retained at gate time):
   - preflight, format:check, lint, typecheck, test:types — exit 0.
   - docs:validate ok (212 documents, 96 issues); docs:links ok (1,097
     links); issues:graph; docs:check — exit 0.
   - architecture tests (13) + `architecture:check: ok (62 source files, 8
     package rules enforced)` — no second router, dependency direction
     frozen and valid, raw HX strings confined to @bundar/htmx.
   - bench:smoke; `bench:parity: 9 scenarios passed raw Bun/Hono/Bundar
     parity checks`; bench:report on the committed m1 artifact (static fast
     path within tolerance) and on the committed m2 artifact (parity held
     before timing; escaping markers present) — exit 0.
   - core contract matrix 42 tests; type consumers: core 9, jsx (tsc),
     schema 5, routes 6 — exit 0.
   - routes:check up to date; `api:check: artifacts/api/core.md matches the
     public surface (71 runtime + 0 type exports)` — exit 0.
   - pack:inspect green for core, jsx, schema, security (core and jsx with
     zero runtime dependencies).
   - security:raw-html-audit; security:validation-redaction; security:jsx
     (13 hostile payloads); security:csrf; security:cookies — exit 0.
   - browser lanes: htmx2 and htmx4 smoke/interaction + CSRF + session
     scenarios passed with the negative fixture failing as expected;
     browser:report 2 lanes; `browser:jsx: DOM interpretation matches
     intended structure for all edge cases` — exit 0.
   - full `bun test` — 516 tests across 64 files, 0 fail — exit 0.
   - `build` — exit 0.
3. `bun run architecture:check` (standalone, the planned command) — exit 0.
4. `bun run pack:inspect @bundar/jsx` (standalone, the planned command) —
   exit 0 (files allow-list, zero runtime dependencies).
5. `bun run api:check` (standalone, the planned command) — exit 0.
6. `bun run docs:validate` / `docs:links` after adding the gate record and
   this transcript — exit 0.

## Acceptance evidence mapping

- "No React/hydration dependency or browser lifecycle exists" — @bundar/jsx
  imports no package (pack:inspect + 8-rule architecture check); browser
  event handlers are typed to a diagnostic and rejected at runtime
  (conformance matrix).
- "Escaping/security suites pass" — all five security audits plus the
  property suite and the real-browser comparison, inside the battery.
- "Core/JSX dependency direction remains valid" — frozen rules enforced
  (core/jsx zero-dependency; htmx→jsx; schema→core; security→core).
- "Performance evidence and known limitations are recorded" —
  `delivery/gates/m2-performance.md` (GH-037) with the baseline table,
  budgets, and the documented ~3× streaming trade-off; the m2 artifact is
  verified (not regenerated) in CI.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every one of the 37 steps exit 0; nothing
  skipped.
- OKF/log updates — `delivery/gates/m2.md` + index, closure record below,
  `issues/m2/index.md`, `log.md`, this transcript.

## Residual risks and deviations

- Carried from GH-037: single-machine baselines (raw samples retained);
  memory proxies advisory.
- Carried from GH-034: streaming overhead (~3× buffered for large async
  lists); non-signal-aware child promises settle on their own after
  cancellation; no replacement status after the first flush.
- Exotic HTML tags fall back to loose `jsx()` typing; hx grammar validation
  for open-string attributes stays with the dialect adapters (M3).
- The planned commands matched implemented scripts verbatim
  (`ci:m2`, `architecture:check`, `pack:inspect @bundar/jsx`, `api:check`)
  — no substitutions needed.

## Newly unblocked / authorization

- GH-071 (create-bundar scaffolding) and GH-079 (generated API reference
  source) — authorized on this foundation. **The M2 milestone is closed.**
