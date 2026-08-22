# GH-037 verification transcript — M2 JSX performance and memory gate

## Issue

[GH-037 — Run the M2 JSX performance and memory
gate](../../issues/m2/gh-037-run-the-m2-jsx-performance-and-memory-gate.md)
(branch `gh-037-m2-jsx-perf`, worktree `bundar-gh-037`, base commit
`52a7b56` = main after the GH-036 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/jsx `0.0.0` (zero runtime dependencies; pack:inspect green).
- htmx: not involved (renderer-level gate). OS: Linux `7.0.0-28-generic`
  x86_64, 12 CPUs.

## What changed

- `tools/benchmark/m2-jsx.ts` (new) + `bench:m2` script: the M2 JSX gate —
  seven scenarios (small fragment, full document, 1,000-item list, 50-deep
  nested components, 10 async components, escaping-heavy hostile payload,
  streaming a 1,000-item async list), each measured **cold** (tree
  construction + first render — the startup proxy) and **steady** (prebuilt
  tree after warmup). Parity is asserted BEFORE timing (async ≡ streaming
  byte-for-byte; sync agrees whenever it accepts the tree), and each
  scenario's timed output must contain its escaped marker — a benchmark can
  never be met by disabling escaping. Memory proxies (rss/heapUsed deltas
  around each block) recorded per scenario. Raw samples retained.
- `tools/benchmark/report.ts`: `bench:report` now dispatches on the
  artifact's `gate` field — m2 artifacts print the cold/steady table +
  memory proxies and re-verify the parity map; m1 behavior unchanged
  (regression-checked).
- `delivery/gates/m2-performance.md` (new) + index entry: methodology,
  recorded baseline table, and **reviewed budgets** — steady p50 ≤ 1.5× the
  recorded baseline at GH-083; parity and escaping presence are absolute
  (any failure fails the gate, not a budget).
- `tools/benchmark/runner.ts`: `distribution`/`percentile` exported for
  reuse (no behavior change).
- **Real defect found and fixed by the parity pre-check**: the async
  renderer (`renderNodeAsync`) emitted closing tags for void elements
  (`<meta charset="utf-8"></meta>`) and skipped raw-text serialization —
  disagreeing with the sync renderer and the streaming walker. Fixed in
  `packages/jsx/src/render/async.ts` to mirror sync semantics exactly; the
  parity pre-check now pins all three renderers byte-for-byte on every gate
  run, and the jsx suite (146 tests) stays green.
- `artifacts/bench/m2.json` (new, committed): gate `m2-jsx`, schema 1 — 14
  measurements, parity map (7 scenarios), memory-proxy blocks, raw samples.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun run bench:m2` (defaults `--output artifacts/bench/m2.json`) — exit
   0; "wrote 14 measurements (7 scenarios × cold/steady) with parity
   pre-checks".
3. `bun run bench:report artifacts/bench/m2.json` — exit 0; prints the
   cold/steady table and memory proxies, re-verifies parity, points at the
   budgets document.
4. `bun run bench:report artifacts/bench/m1.json` — exit 0 (m1 dispatch
   regression: static tolerance check still enforced).
5. `bun run --filter @bundar/jsx typecheck` and root `bun run typecheck` —
   exit 0.
6. `bun run lint`, `bun run format:check` — exit 0.
7. `bun test ./packages/jsx` — exit 0; 146 tests.
8. `bun test` (full) — exit 0; 516 tests across 64 files, 0 fail.
9. `bun run architecture:check` — exit 0. `bun run build` — exit 0.
   `bun run docs:validate` (211 documents) / `docs:links` (1,090 links) —
   exit 0. `bun run pack:inspect @bundar/jsx` — exit 0.

## Recorded baseline (gate run, p50 µs)

| scenario | cold | steady |
| --- | --- | --- |
| small-fragment | 3.2 | 1.1 |
| full-document | 8.2 | 5.5 |
| large-list-1000 | 1,200.9 | 1,084.0 |
| nested-components-50 | 36.6 | 48.7 |
| async-components-10 | 17.0 | 13.0 |
| escaping-heavy | 46.9 | 43.0 |
| streaming-large-list | 6,683.4 | 3,514.4 |

Memory proxies (advisory deltas): rss +2.2…+15.7 MiB per block,
heap −12.6…+12.6 MiB — full table in the artifact.

## Acceptance evidence mapping

- "Compared outputs are semantically equivalent before timing" — the gate
  fails closed on any renderer disagreement before a single sample is
  taken; this run's pre-check is what caught the async void-element defect.
- "Raw data, environment, and exact package commits are retained" — the
  artifact keeps every raw sample plus environment fields; the gate commit
  is recorded above and in the artifact's generation block (worktree base
  `52a7b56`).
- "Escaping cannot be disabled to meet a benchmark" — escaped markers are
  asserted present in the parity (i.e. timed) output of every scenario;
  absence fails the gate.
- "Regression budgets are reviewed and documented" —
  `delivery/gates/m2-performance.md`: steady p50 ≤ 1.5× baseline at GH-083;
  parity and escaping absolute.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped; the
  parity defect was FIXED, not bypassed.
- OKF/log updates — gate record + delivery index, closure record,
  `issues/m2/index.md`, `log.md`, this transcript.

### Tooling decisions

- The planned `bun run bench:parity -- jsx` command is covered
  equivalently-and-stronger inside `bench:m2`: renderer parity is asserted
  per scenario BEFORE timing (fail-closed), rather than as a separate
  optional step.
- `bench:m2` and `bench:report` were added verbatim as planned.

## Residual risks

- Single machine, single run; p50 run-to-run variance is tens of percent —
  the 1.5× budget has headroom and raw samples are retained for audit.
- Memory proxies are advisory (no portable allocation profiler in Bun).
- The nested-components cold/steady inversion is retained honestly in the
  artifact (allocation-pattern variance across measurement blocks).

## Newly unblocked

- GH-038 (M2 server-JSX gate record) and the M2 baseline contribution to
  GH-083.
