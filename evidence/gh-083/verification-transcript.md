# GH-083 verification transcript — final alpha performance and regression budgets

## Issue

[GH-083 — Run final alpha performance and regression
budgets](../../issues/m6/gh-083-run-final-alpha-performance-and-regression-budgets.md)
(branch `gh-083-perf-budgets`, worktree `bundar-gh-083`, base commit
`de1accb` = main after the GH-082 merge).

## Environment (exact versions, archived as
`artifacts/bench/environment.json`)

- Bun `1.4.0`; TypeScript `6.0.3`; Hono parity fixture `4.13.3`; Linux
  `7.0.0-28-generic` x86_64, 12 cores; htmx pins 2.0.10 (stable) /
  4.0.0-beta6 (experimental — no GA claim); recording commit stamped in
  the manifest.

## What changed

- `tools/benchmark/release.ts` (new) + `bench:release`: the full suite
  (27 measurements, 9 parity checks) into
  `artifacts/bench/alpha.json`, gated by a PACKED-CANDIDATE guard
  (`test:pack-consumers` — the measured source is the packable source;
  the GH-081 cleanroom proves packed install behavior), plus the
  environment manifest binding every number to runtime/hardware/pins/
  commit.
- `tools/benchmark/regression.ts` (new) + `bench:regression`: the
  fail-closed budget gate —
  - parity re-verified from archived snapshots (with the runner's exact
    normalization) BEFORE any budget logic; failures void budgets;
  - RATIO budgets: same-run Bundar÷raw-Bun ratios pooled over three
    fresh runs (`--generate`), widened by robust dispersion (median +
    k·MAD + calibrated safety factors). Ratios cancel machine load —
    proven necessary when absolute budgets breached on the UNCHANGING
    raw-Bun and Hono fixtures under load noise;
  - only Bundar ratios are gated (the third-party Hono fixture is
    context and parity reference, not our regression surface);
  - startup ready-time and RSS use generous absolute pooled budgets
    (noise-dominated);
  - missing budgets fail closed (new scenario = risk, not a pass);
    stale budgets alert.
- `artifacts/bench/{alpha.json,environment.json,alpha-budgets.json}`
  (committed, machine-readable) and `docs/performance/alpha.md`: the
  environment-bound results doc with the "measured on THIS environment"
  framing, the headline tables, and an explicit no-leadership-claims
  section.

## Headline results (this environment; see the doc + manifest)

- Startup: raw Bun 5.3 ms / Bundar 16.1 ms ready p50; RSS 15.7 vs
  29.1 MB.
- Scenario p50s: Bundar tracks raw Bun within low single-digit µs on
  routing/middleware; rendering/negotiation paths sit in Hono's range
  (e.g. static 1.2 µs, parameterized 1.7 µs, negotiation 2.9 µs,
  validated form 8.4 µs — the full progressive pipeline).
- All 9 parity checks pass (behavior parity before timing).

## Budget stability evidence

After calibration, three consecutive independent
`bench:release`+`bench:regression` probes: **3/3 within budget**
(0–2 informational alerts, 0 failures). The calibration journey is part
of the evidence: absolute budgets falsely failed on raw-Bun/Hono under
load; ratio budgets on the fixture mis-attributed third-party noise;
the final design gates only what Bundar owns.

## Exact commands and exit statuses

1. `bun run bench:release` — exit 0 (packed-candidate guard 8/8; 27
   measurements + 9 parity checks; environment manifest written).
2. `bun run bench:parity` — exit 0 (9/9 scenarios byte-comparable).
3. `bun run bench:regression -- --generate` — exit 0 (13 budgets from 3
   pooled runs).
4. `bun run bench:regression` — exit 0 (within budget; verified stable
   across three probes).
5. `bun run typecheck` / `lint` / `format:check` — exit 0.
6. `bun run architecture:check` — exit 0; `api:check` — exit 0.
7. `bun test` (full) — exit 0; 827 tests across 101 files, 8,320
   expect() calls, 0 fail.
8. `bun run build` — exit 0; `docs:validate` (216 docs) / `docs:links`
   (1,165 links) — exit 0.

## Acceptance evidence

- **All compared scenarios pass behavior parity**: 9/9 live + archived
  re-verification inside the gate.
- **Raw data and environment manifest archived**: alpha.json +
  environment.json (commit-stamped) + budgets committed.
- **Thresholds account for noise and reward nothing unsafe**: ratio
  budgets proven noise-stable (3/3 probes); parity failures void
  budgets; missing budgets fail closed.
- **Release notes describe environment-specific results**: the doc's
  framing + manifest; no universal claims, no rps leadership.

## Residual risks and deviations

- Budgets are calibrated on this machine class; a different environment
  requires regeneration (documented in the doc).
- "From packed release candidates" is realized via the packed-candidate
  guard (pack-verified source + the GH-081 packed cleanroom); running
  the bench harness itself from tarballs adds no signal beyond that
  guard and is recorded as this substitution.

## Newly unblocked issues

GH-087 (release notes can cite the measured tables).
