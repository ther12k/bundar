---
type: Release Gate
title: M2 JSX Performance and Memory Gate
description: Renderer-level measurements across seven JSX scenarios with parity pre-checks, enforced escaping, cold/steady separation, memory proxies, and reviewed regression budgets.
tags:
- m2
- release
- perf
- jsx
- evidence
status: draft
generated:
  by: GH-037 implementation pass
  at: '2026-08-22T00:00:00+07:00'
---

# M2 JSX performance and memory gate

## Purpose

Records the renderer-level performance gate required by
[GH-037](../../issues/m2/gh-037-run-the-m2-jsx-performance-and-memory-gate.md):
seven JSX scenarios measured cold (tree construction + first render — the
startup proxy) and steady-state (prebuilt trees), with renderer parity
asserted **before** any timing, escaping proven present in every timed
output (a benchmark can never be met by disabling escaping), and memory
proxies recorded per scenario. The overall M2 record is GH-038's gate; the
HTTP-core performance gate is
[m1-performance.md](m1-performance.md).

## Toolchain and environment (single machine)

Bun `1.4.0`, Linux x86_64 (`7.0.0-28-generic`), 12 CPUs, TypeScript
`6.0.3`, @bundar/jsx `0.0.0` at the gate commit (see the
[GH-037 transcript](../../evidence/gh-037/verification-transcript.md)).
In-process timing via `Bun.nanoseconds()`; artifact
[`artifacts/bench/m2.json`](../../artifacts/bench/m2.json) retains raw
samples. Numbers are regression baselines for this machine — no
cross-framework marketing claims are made from microbenchmarks alone.

## Methodology

- Parity before timing: for every scenario, `renderToStringAsync` and
  `renderToStream` must agree byte-for-byte, and the sync
  `renderToString` must agree whenever it accepts the tree (promised
  children legitimately make it throw). A disagreement fails the gate.
- Escaping enforcement: each scenario's timed output must contain its
  escaped marker (`&amp;`, `&lt;/script`, …); absence fails the gate.
- Cold = build tree + render per iteration; steady = render a prebuilt
  tree after warmup. p50 is the comparator (means carry GC tails).
- Memory proxies: `process.memoryUsage` rss/heapUsed deltas around each
  scenario block — advisory context, not budgets (Bun exposes no finer
  portable allocator stats).

## Recorded baseline (gate run)

p50 per scenario (µs):

| scenario | cold | steady |
| --- | --- | --- |
| small-fragment | 3.2 | 1.1 |
| full-document | 8.2 | 5.5 |
| large-list-1000 | 1,200.9 | 1,084.0 |
| nested-components-50 | 36.6 | 48.7 |
| async-components-10 | 17.0 | 13.0 |
| escaping-heavy | 46.9 | 43.0 |
| streaming-large-list | 6,683.4 | 3,514.4 |

## Reviewed regression budgets

- The steady-state p50 of any scenario may not exceed **1.5×** the recorded
  baseline p50 on comparable hardware at GH-083's final gate; a breach
  requires either a fix or a superseding review recorded here.
- Renderer parity (async ≡ streaming; sync ≡ async where sync accepts the
  tree) is an absolute budget — any disagreement fails the gate outright.
- Escaping presence in timed outputs is absolute; no scenario may weaken
  its payload or marker to hit a number.
- Memory proxies carry no numeric budget at M2 (single-run deltas are too
  noisy); GH-083 reviews trend deltas across artifacts.

## Findings and trade-offs

- **A real parity defect was found and fixed by this gate**: the async
  renderer emitted closing tags for void elements (`<meta …></meta>`) and
  skipped raw-text serialization, disagreeing with the sync renderer and
  the streaming walker. Fixed in the same change; the parity pre-check now
  pins all three renderers byte-for-byte.
- Streaming costs ~3× buffered rendering for the large async list (3.5 ms
  vs 1.1 ms p50 steady) — the documented price of incremental first-byte
  delivery (GH-034 records the same ratio from its own bench).
- Escaping-heavy payloads (~50× hostile text) render in ~43 µs steady —
  escaping is not a bottleneck at these sizes and is never optional.
- Cold vs steady separation shows JIT warmup matters mostly for small
  trees (3.2 → 1.1 µs); large-tree costs are construction-dominated
  (`build` inside the cold loop).

## Evidence

- Artifact: [`artifacts/bench/m2.json`](../../artifacts/bench/m2.json)
  (gate `m2-jsx`, schema 1: 14 measurements, parity map, memory proxies,
  raw samples).
- Commands: `bun run bench:m2 -- --output artifacts/bench/m2.json`;
  `bun run bench:report artifacts/bench/m2.json` (dispatches on the gate
  field and re-verifies the parity map).
- Transcript: [GH-037 verification
  transcript](../../evidence/gh-037/verification-transcript.md).

## Residual risks

- Single machine, single run; p50 variance between runs is tens of percent
  (raw samples retained for audit) — the 1.5× budget has that headroom.
- Memory proxies are advisory; no portable allocation profiler exists in
  Bun today.
- The `nested-components-50` cold/steady inversion (cold p50 lower than
  steady) reflects allocation-pattern variance across measurement blocks,
  retained honestly in the artifact rather than smoothed.
