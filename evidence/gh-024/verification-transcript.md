# GH-024 verification transcript — M1 performance and resource gate

## Issue

[GH-024 — Run the M1 performance and resource gate](../../issues/m1/gh-024-run-the-m1-performance-and-resource-gate.md)
(branch `gh-024-m1-perf-gate`, worktree `bundar-gh-024`, base commit
`b06b59c` = main after the GH-023 merge).

## Environment (exact versions)

- Bun `1.4.0` (`Bun.version` inside the harness; `packageManager: bun@1.4.0`).
- TypeScript `6.0.3`, ESLint `10.8.1`, Prettier `3.9.6`.
- Hono baseline `4.13.3` (pinned dev dependency, verified in
  `node_modules/hono/package.json`).
- @bundar/core and @bundar/jsx at workspace version `0.0.0` (the adapter
  imports the workspace sources directly).
- htmx: not involved in this gate (HTTP-core scenarios only).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs, 13th Gen Intel Core i5-13420H
  (CPU model recorded here from `/proc/cpuinfo`; the artifact itself records
  it as unavailable from a portable Bun API).

## What changed

- `tools/benchmark/bundar-app.ts` (new): the real Bundar benchmark app — an
  `App` covering all 9 scenarios, compiled once through `compileRoutes`;
  middleware chains composed once at module scope (GH-018 semantics). Kept
  free of hono/harness imports so the startup probe can load it in isolation.
- `tools/benchmark/adapters.ts`: the Bundar adapter is now this real app
  (previously an intentional 501 stub from GH-007). In-process dispatch is a
  property lookup on the compiled route table, disclosed as standing in for
  Bun's native C++ dispatch; static entries are cloned per request because a
  JS `Response` body is one-shot while Bun's native layer re-sends static
  responses per request.
- `tools/benchmark/startup-probe.ts` (new): fresh-subprocess startup/RSS probe
  (modes: raw switch handler with no framework; bundar app registration +
  compile + middleware composition).
- `tools/benchmark/runner.ts`: times all three adapters (the old code excluded
  bundar from timing), adds the startup/RSS resource section, report schema
  version 2.
- `tools/benchmark/report.ts` (new): prints the comparison and enforces the
  reviewed static fast-path tolerance (≤ 2.0× raw-bun p50) with a non-zero
  exit on violation.
- `tools/benchmark/types.ts`: `StartupDistribution`, `BenchmarkResources`,
  `schemaVersion: 2`.
- `package.json`: `bench:m1` and `bench:report` scripts (the issue's planned
  command contract).
- `tests/benchmark/benchmark.test.ts`: the GH-007 "Bundar is deferred" test is
  replaced by "Bundar parity comes from a real compiled app"; the report test
  asserts schema 2, 3 adapters, and the resources section.
- `artifacts/bench/m1.json` (new, committed): the gate artifact (27 timed
  results, 9 parity results, raw samples, startup/RSS probes).
- `delivery/gates/m1-performance.md` (new) + `delivery/index.md` entry: the
  gate record with methodology, reviewed tolerance, results, trade-offs.
- GitHub optimization issue
  [#97](https://github.com/ther12k/bundar/issues/97) opened for the measured
  `parseForm` overhead (~2.5× raw; hono measures 2.09× on the same scenario)
  per the deliverable "open optimization issues for material overhead rather
  than distorting APIs without evidence".

## Exact commands and exit statuses (final code state)

All commands run in the worktree root on the final committed code.

1. `bun install --frozen-lockfile` — exit 0 (no dependency changes).
2. `bun run bench:parity` — exit 0;
   `bench:parity: 9 scenarios passed raw Bun/Hono/Bundar parity checks`.
3. `bun run bench:m1` (= `bun tools/benchmark/runner.ts --output
   artifacts/bench/m1.json`; 100 warmup / 1,000 measured iterations,
   7 startup samples per mode) — exit 0;
   `bench: wrote 27 measurements and 9 parity checks to .../artifacts/bench/m1.json`.
4. `bun run bench:report artifacts/bench/m1.json` — exit 0; full table below;
   final line `bench:report: static fast path within tolerance: 0.65× raw-bun
   p50 ≤ 2.00× reviewed ceiling`.
5. `bun run format` / `bun run format:check` — exit 0.
6. `bun run lint` — exit 0 (0 problems).
7. `bun run typecheck` — exit 0.
8. `bun test` — exit 0; 352 tests, 0 fail, 2,927 expect() calls (the two
   former "deferred adapter" assertions were updated, none skipped).
9. `bun run architecture:check` — exit 0; 46 source files, 7 package rules.
10. `bun run docs:validate` — exit 0 after this transcript was added (209
    documents, 96 issues; the gate doc links to this transcript).
11. `bun run docs:links` — exit 0 (1,063 links across 209 documents).
12. `bun run issues:graph` — exit 0 (M1 wave: 15 issues).
13. `bun run build` — exit 0.

## Benchmark summary (committed artifact run)

p50 per scenario (µs), ×raw-bun(p50) in parentheses:

| scenario | raw-bun | hono 4.13.3 | bundar |
| --- | --- | --- | --- |
| static-response | 2.40 | 3.02 (1.25×) | 1.55 (0.65×) |
| dynamic-text | 1.79 | 1.69 (0.95×) | 2.17 (1.22×) |
| parameterized-route | 1.52 | 1.92 (1.27×) | 1.88 (1.24×) |
| sync-middleware | 1.39 | 1.72 (1.24×) | 1.79 (1.29×) |
| async-middleware | 1.79 | 1.64 (0.91×) | 1.64 (0.91×) |
| escaped-jsx-fragment | 1.34 | 1.58 (1.18×) | 3.64 (2.71×) |
| async-jsx-component | 1.55 | 2.23 (1.44×) | 4.31 (2.78×) |
| page-fragment-negotiation | 5.36 | 3.63 (0.68×) | 3.12 (0.58×) |
| validated-form | 6.69 | 13.99 (2.09×) | 16.59 (2.48×) |

Startup/RSS probes (fresh subprocess per sample, 7 samples each): raw-bun
ready 2.7ms min / 3.2ms p50, RSS 15.4/15.6MiB; bundar ready 7.3ms min /
11.0ms p50, RSS 24.3/24.6MiB.

Static tolerance across three runs of the final code: 0.91×, 1.22×, 0.65× —
all within the reviewed 2.0× ceiling.

## Acceptance evidence mapping

- "Behavior parity tests pass before benchmark comparison" — `runBenchmark()`
  runs `parityCheck()` (all 3 adapters × 9 scenarios, exact body bytes) before
  any timing and fails closed on mismatch; `bench:parity` is also a standalone
  command (step 2 above).
- "Environment and exact dependency versions are recorded" — this transcript
  and the artifact's `environment` + `resources.note` fields.
- "Static fast path remains near raw Bun within the reviewed tolerance" —
  ≤ 2.0× ceiling reviewed in `delivery/gates/m1-performance.md` and enforced
  by `bench:report` (step 4).
- "No absolute 'fastest' claim is made from one machine" — gate doc states
  in-process baselines only; every ratio is labeled relative; residual risks
  name single-machine variance and the native-dispatch substitution.
- "Exact verification commands, environment versions, and evidence locations
  attached" — this transcript + gate doc + committed artifact.
- "No mandatory test failure is hidden, skipped, or converted to a warning" —
  the two updated assertions now assert the real adapter; `bun test` exit 0
  with 0 fail; nothing skipped.
- "Relevant OKF concepts, compatibility notes, and changelog/log entries
  updated in the same change" — `delivery/gates/m1-performance.md` (new),
  `delivery/index.md`, `issues/m1/gh-024-*.md` criteria checked,
  `issues/m1/index.md`, `log.md`.

## Residual risks and deviations

- Single-machine variance: p50 ratios move by tens of percent between runs;
  the ceiling has headroom and GH-083 must re-run before any public claim.
- The in-process table lookup stands in for Bun's native dispatch (disclosed
  in the gate doc and the artifact note); absolute numbers could shift under
  real `Bun.serve`, so only parity and relative overhead are claimed.
- `cpuModel` in the artifact is "unavailable from portable Bun API"; the exact
  CPU is recorded in this transcript instead.
- The issue's planned commands `bench:m1`/`bench:report` were added verbatim
  as scripts (no placeholder substitution was needed).
- JSX ratios (2.7–2.8×) compare per-request render+escape against prebuilt
  constant strings in the baselines — a workload difference disclosed in the
  gate doc; renderer budgets belong to M2 (GH-030/GH-032 evidence already
  carries renderer-level micro-benches).

## Newly unblocked

- GH-025 (M1 HTTP-core gate record) — both dependencies (GH-023, GH-024) now
  complete.
- Feeds GH-083 (final alpha performance and regression budgets) with the M1
  baseline artifact.
