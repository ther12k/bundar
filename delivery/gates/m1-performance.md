---
type: Release Gate
title: M1 Performance and Resource Gate
description: Evidence-backed M1 measurement of Bundar HTTP-core overhead against raw Bun and pinned Hono baselines, with reviewed tolerances, trade-offs, and tracked optimization follow-ups.
tags:
- m1
- release
- perf
- evidence
status: draft
generated:
  by: GH-024 implementation pass
  at: '2026-08-22T00:00:00+07:00'
---

# M1 performance and resource gate

## Purpose

This gate records the M1 performance and resource measurements required by
[GH-024](../../issues/m1/gh-024-run-the-m1-performance-and-resource-gate.md):
Bundar HTTP-core overhead measured against equivalent raw Bun and pinned Hono
scenarios, with regressions and trade-offs documented. It is the performance
half of the M1 record; the overall M1 HTTP-core gate is authored separately by
GH-025. The gate is governed by the
[release-gate standard](../../engineering/release-gates.md).

## Toolchain and environment (recorded, single machine)

- Runtime: Bun `1.4.0` (`Bun.version`).
- Baseline: Hono `4.13.3` (pinned dev dependency).
- Operating system: Linux x86_64, kernel `7.0.0-28-generic`, 12 CPUs.
- TypeScript `6.0.3`, ESLint `10.8.1`, Prettier `3.9.6` for the surrounding
  tooling; the benchmark itself uses `Bun.nanoseconds()` for timing.

All numbers below come from one machine on one run of the committed artifact
[`artifacts/bench/m1.json`](../../artifacts/bench/m1.json). They are
in-process baselines for regression tracking, not absolute performance claims;
run-to-run p50 ratios on this machine move by tens of percent, which is why
the reviewed tolerance below has headroom and why no "fastest" claim is made.

## Methodology

- Timing is in-process `Request`/`Response` with no localhost networking
  (GH-007 harness methodology): each adapter receives a fresh `Request` per
  iteration and the response body is fully consumed before sampling ends.
- Parity across raw-bun, hono, and bundar is asserted for all 9 scenarios
  **before** any timing (status, normalized content-type/vary headers, exact
  body bytes). `bun run bench:parity` re-runs this alone.
- Warmup 100 iterations, measured 1,000 iterations per scenario/adapter; every
  raw sample is kept in the artifact (`samplesNs`), and p50 is the comparison
  statistic because means carry heavy GC tails (relative standard deviations
  up to ~7× are visible in the raw samples).
- The Bundar adapter is a real `App` compiled through `compileRoutes`
  (`tools/benchmark/bundar-app.ts`). In-process dispatch is a property lookup
  on the compiled route table standing in for Bun's native C++ route dispatch,
  which is at least as fast; this substitution is disclosed rather than
  hidden. Static route entries return the canonical `Response` cloned per
  request, because Bun's native layer re-sends static responses per request
  while a JS `Response` body is one-shot.
- Startup and RSS probes run the same app surface in fresh Bun subprocesses
  (`tools/benchmark/startup-probe.ts`, 7 samples per mode): raw mode is a
  hand-rolled switch handler with no framework; bundar mode is `App`
  registration + `compileRoutes` + middleware composition. `readyMs` is
  `performance.now()` read at app-ready (process boot → ready); RSS is
  `process.memoryUsage.rss()` after the build.
- Context-creation cost is measured separately and durably by the
  [GH-017 context bench](../../evidence/gh-017/context-bench.json); the static
  fast path and middleware composition have their own committed artifacts from
  GH-016/GH-018 under `evidence/`.

## Reviewed tolerance: static fast path

The compiled static fast path is a table lookup returning the same `Response`
object raw Bun would build by hand. Reviewed ceiling: **Bundar static-response
p50 must stay ≤ 2.0× the raw-bun p50** on this scenario. The ceiling is
enforced fail-closed by `bun run bench:report` (non-zero exit on violation),
not by after-the-fact inspection.

Observed across the three runs of the final code on this machine: 0.91×,
1.22×, and 0.65× — comfortably inside the ceiling; the fast path performs no
per-request allocation beyond the disclosed clone and no Context creation
(GH-016 by-identity semantics).

## M1 results (committed artifact run)

p50 per scenario (µs), with ×raw-bun(p50) in parentheses:

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

Startup/RSS probes (fresh subprocess per sample, 7 samples):

| mode | ready min / p50 | RSS min / p50 |
| --- | --- | --- |
| raw-bun | 2.7ms / 3.2ms | 15.4MiB / 15.6MiB |
| bundar | 7.3ms / 11.0ms | 24.3MiB / 24.6MiB |

## Trade-offs and accepted findings

- **HTTP-core scenarios are within noise of raw Bun.** dynamic, parameterized,
  sync/async middleware, and negotiation all land between 0.58× and 1.29×,
  i.e. the compiled table + per-request `Context` + composed middleware cost is
  inside single-machine run variance of a hand-written switch. The middleware
  onion adds no framework Promise on the sync fast path (GH-018), which is why
  sync chains are not measurably slower than raw.
- **JSX scenarios do strictly more work than the baselines, by design.** The
  raw-bun and hono adapters return prebuilt constant strings; the Bundar
  adapter builds a JSX tree and renders + escapes it per request. The 2.7–2.8×
  ratios are workload differences disclosed here, not framework overhead
  claims. Renderer-level budgets belong to the M2 renderer benchmark.
- **`parseForm` bounded parsing is the largest material overhead** (~2.5× raw
  `URLSearchParams(await request.text())`; hono's `parseBody` measures 2.09×
  on the same scenario). The bounded parser's limits, pre-checks, and
  single-consumption guard are GH-031 security requirements and stay locked.
  Per the GH-024 deliverable, this is tracked as optimization issue
  [#97](https://github.com/ther12k/bundar/issues/97) instead of being
  optimized speculatively or hidden.
- **Startup and RSS deltas are bounded and explained.** ~8ms additional
  process-ready time and ~9MiB additional RSS for loading the compiled core +
  JSX modules and building a 10-route app. These are one-time costs per
  process, not per-request costs, and are recorded as the M1 baseline for the
  M6 final budgets (GH-083).

## Evidence

- Artifact: [`artifacts/bench/m1.json`](../../artifacts/bench/m1.json)
  (schema version 2: 27 timed results, 9 parity results, raw samples, startup
  and RSS probes).
- Commands: `bun run bench:parity`, `bun run bench:m1 -- --output
  artifacts/bench/m1.json` (the `--output` default already targets this path),
  `bun run bench:report artifacts/bench/m1.json`.
- Transcripts: [GH-024 verification
  transcript](../../evidence/gh-024/verification-transcript.md);
  [GH-016 static bench](../../evidence/gh-016/static-response-bench.json);
  [GH-017 context bench](../../evidence/gh-017/context-bench.json);
  [GH-018 middleware bench](../../evidence/gh-018/middleware-bench.json).

## Residual risks

- Single-machine, single-run variance is significant (p50 ratios move by tens
  of percent between runs); the tolerance ceiling and the p50 comparator are
  chosen with that headroom, and GH-083 must re-run the suite on the release
  machine before any public performance statement.
- The in-process route-table lookup stands in for Bun's native dispatch; real
  `Bun.serve` dispatch could shift absolute numbers either way, which is why
  only parity and relative overhead are claimed.
- `cpuModel` is recorded as unavailable from a portable Bun API; environment
  identity rests on platform/arch/CPU-count/kernel recorded above and in the
  artifact.
