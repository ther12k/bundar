# GH-150 verification transcript — Streaming chunk coalescing (BR-098)

Issue #150 · branch `gh-150-streaming-coalesce` · base main `deca971`.

## Background & Problem

During BR-077 profiling, streaming large server-rendered tables was observed paying ~12–15 µs of chunk-emission overhead per row, resulting in 10k-table streamed totals of ~151 ms (8.12× the string render of ~18.6 ms). This was caused by per-tag generator suspensions and individual chunk encoding in the depth-first walker.

## What changed

- `packages/jsx/src/render-to-stream.ts`:
  - Introduced `ChunkCollector`: batches synchronous text fragments up to `chunkBytes` bound (default 8 KiB) before enqueueing to the `ReadableStream` controller.
  - Flushes accumulated chunks immediately before awaiting any promised child or async component, guaranteeing instant time-to-first-byte (TTFB) and progressive streaming.
  - Preserves backpressure (via `ByteLengthQueuingStrategy`), signal cancellation, late-error termination (`StreamRenderError` with exact `bytesWritten`), and cycle detection.
- `tools/benchmark/beta-workloads.ts` & `artifacts/bench/beta.json`:
  - Pre-timing byte-parity checks pass without modification (streamed output is 100% byte-identical to `renderToString`).
  - `table-stream-10000` p50 dropped from **151.2 ms** to **25.6 ms** (a **~6× improvement**).
  - Stream-over-string p50 ratio dropped from **8.12×** to **1.61×** at 10k rows.
  - TTFB p95 remains sub-millisecond (~0.8 ms), well below the 2 ms acceptance threshold.
- `artifacts/bench/beta-budgets.json`: Regenerated from 3 pooled runs; `bench:beta --verify` passes cleanly with 0 alerts.
- `docs/performance/beta.md`: Updated with the coalesced benchmark results.

## Verification results

- JSX streaming tests: **23 pass / 0 fail** across 3 files.
- Full repository test suite: **1,172 pass / 0 fail** across 148 files.
- `bench:release` + `bench:regression` + `bench:beta --verify`: all within budget, 0 alerts.
- `tsc --noEmit`, `eslint .`, `prettier --check .`, `architecture:check`, `docs:check`: all exit 0.

## Acceptance criteria

- [x] Streamed output remains byte-identical to string rendering for every existing fixture (verified pre-timing by beta workload harness).
- [x] BR-072 backpressure/cancellation/late-error conformance passes unchanged.
- [x] `table-stream-10000` p50 improves by at least 2× (measured ~6× improvement: 151 ms -> 25.6 ms) while `ttfb` p95 stays under 2 ms (measured ~0.8 ms).
- [x] Budgets regenerated from pooled runs; `bench:beta --verify` green.
EOF
cat >> log.md <<'EOF'

## 2026-08-27 — BR-098 (#150): streaming chunk coalescing speedup (~6× on 10k tables)

- `packages/jsx/src/render-to-stream.ts`: introduced `ChunkCollector` batching consecutive synchronous JSX fragments into 8 KiB chunks before controller enqueueing. Flushes before awaiting async promises to preserve progressive delivery and instant TTFB.
- 10k-table stream consumption dropped from ~151 ms down to ~25.6 ms (~6× speedup) and stream-over-string ratio fell from 8.12× to 1.61× while preserving byte-for-byte output equality and BR-072 backpressure/cancellation conformance.
- Beta budgets regenerated from 3 pooled runs; `bench:beta --verify` and `bench:regression` green with 0 alerts.
EOF