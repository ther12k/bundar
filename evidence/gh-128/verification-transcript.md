# GH-128 verification transcript — beta workloads and budgets (BR-077)

## Issue

[GH-128 / BR-077 — Profile large-table rendering and form parsing, then
set beta
budgets](https://github.com/ther12k/bundar/issues/128) (branch
`gh-128-beta-budgets`, worktree `bundar-gh-128`, base `cd929e1`).
All dependencies (BR-052, BR-066, BR-071, BR-072, BR-076) were closed
on main before work started.

## Environment

- Bun `1.4.0`; TypeScript `6.0.3`; Linux `7.0.0-28-generic` x86_64,
  12 cores; valibot `1.4.2` pinned as the Standard Schema provider.
- Recording conditions DISCLOSED: ambient desktop load average 2.4–3.5
  during the accepted recording (interactive editor/browser processes on
  the same box). Two earlier attempts tripped load-sensitive alpha micro
  ratios under load spikes 5.9–12.8 with rSD 400–550% and were retried —
  no budget, tolerance, or formula was modified in response to failures.

## What changed

- `tools/benchmark/beta-workloads.ts` (new): 11 Bundar-mode scenarios;
  correctness asserted before timing:
  - tables: string/stream byte-parity, exact `<tr>` counts, escaping
    markers (`&lt;/td&gt;&lt;script&gt;` present, raw never);
  - updates: composite startsWith primary markup, each OOB target
    present; fragment-only sanity strings;
  - forms: schema acceptance (valibot via `validateForm`), tail-field
    integrity at 100 fields under per-call raised limits, multipart
    files/fields count checks;
  - TTFB distributions for streams; rss/heap deltas advisory.
- Budgets: `artifacts/bench/beta-budgets.json` — same-run
  stream/string ratios (`ratio:table-stream-N:over-string`) +
  MAD-widened absolutes (`abs:*:p50ns`, `abs:*:ttfbP95ns`), generated
  from 3 pooled runs. Fail-closed verify; missing budgets breach;
  stale budgets alert.
- Wiring: `bench:beta` script; `bench:regression` additionally verifies
  the beta artifact after alpha gates pass (warns if absent,
  fail-closed when present but unbudgeted); `bench:release` records
  `beta.json` alongside `alpha.json` + environment manifest at one SHA.
- Tests: `tests/benchmark/beta-workloads.test.ts` — fixture escaping
  shape (rows+1 `<tr>`, escaped hostile cell), BR-077 row tiers,
  median/MAD math, documented ratio factors (30%/60%) including the
  zero-dispersion case, absolute budget headroom vs breach bounds
  (~2× survives noise, ~3× breaches with the observed dispersion).
- Docs: `docs/performance/beta.md` — methodology, results table,
  memory proxies, by-size string-vs-stream recommendation, follow-up
  opportunity registration.

## Commands and exit statuses

On implementation commit `20d26b9`:

- `bun run bench:beta` → 11 measurements + pre-timing correctness, ok.
- `bun run bench:beta --generate` → 17 budgets from 3 pooled runs.
- `bun run bench:beta --verify` → within budget.
- Accepted recording: `bun run bench:release` attempt 2 (23:42–23:43)
  wrote alpha.json + beta.json + environment.json stamped `20d26b9a`;
  `bun run bench:regression` → "within budget" for BOTH gates, 0 alerts.
- `bun test tests/benchmark/` → 14 pass / 0 fail (239 expects).
- Full `bun test` → 0 fail.
- `tsc --noEmit -p tsconfig.json`, `eslint .`, `prettier --check .`,
  `architecture:check`, docs:check/status-check/validate/links, build,
  release:plan → all exit 0 (final battery re-run before merge).

## Acceptance criteria

- [x] Benchmarks verify HTML/result correctness before timing — every
      scenario asserts its invariant pre-timing; parity between render
      modes is byte-level.
- [x] Budgets are environment-normalized and tolerate documented
      variance — stream/string same-run ratios cancel machine speed;
      absolutes use MAD-widened thresholds; generation and verification
      formulas unit-tested; variance behavior disclosed in this
      transcript and in log.md.
- [x] Large input limits prevent benchmarks from normalizing unsafe
      production defaults — production limits untouched; the oversized
      fixture raises limits explicitly per-call through parseForm's
      public argument and would fail at shipped defaults by design;
      policy string recorded inside the artifact itself.
- [x] Report states whether string or stream rendering is recommended
      by workload size — explicit ≤100 / ~1k / ≥10k table plus the
      paginate-first caveat.

## Findings (docs/performance/beta.md)

- TTFB is flat 6–36 µs for streams across sizes; string render blocks
  0.14 ms→18.6 ms before the first byte.
- Stream totals are 8–11× string p50 at all sizes (~12–15 µs/row
  chunk-emission overhead) — registered as a measured follow-up
  opportunity rather than implemented here (touches BR-072
  conformance territory).
- Memory: 10k-row string block RSS +15.1 MiB vs streaming −5.7 MiB.

## Residual risks

- Alpha micro-ratio budgets remain load-sensitive on shared machines
  (pre-existing, documented since GH-083); the beta gate's same-run
  ratios avoid that class of flake by design.
- Beta ratios were generated from pooled runs on THIS machine;
  other hardware should regenerate before enforcing locally.

## Newly opened

- Follow-up issue registered post-merge documenting chunk-coalescing
  opportunity with the measured numbers above (BR-072 adjacency noted).

BR-078…BR-085 chain unchanged; BR-079 human gate remains next for the
release path.
