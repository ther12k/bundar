# GH-034 verification transcript — renderToStream with backpressure and abort

## Issue

[GH-034 — Implement renderToStream with backpressure and abort
handling](../../issues/m2/gh-034-implement-rendertostream-with-backpressure-and-abort-handling.md)
(branch `gh-034-render-to-stream`, worktree `bundar-gh-034`, base commit
`243b1c6` = main after the GH-062 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/jsx `0.0.0` — zero runtime dependencies unchanged (pack:inspect
  green); reuses the existing escaping/attribute/element primitives.
- htmx: not involved (HTMX 4 streaming partial protocol explicitly out of
  scope). OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/jsx/src/render-to-stream.ts` (new):
  - An async-generator walker mirroring `renderNode` semantics segment by
    segment (escaping, cycle detection, component depth guard, void and
    raw-text elements) while awaiting promised children, promised direct
    children, promised array entries, and async component results in
    document order.
  - `renderToStream(tree, { signal?, chunkBytes? })` → `{ stream,
    finished }`: one walker segment enqueued per pull (nothing is held while
    a child resolves — flush points are the awaits themselves);
    `ByteLengthQueuingStrategy` (default 8 KiB high-water mark) gives real
    backpressure — the stream stops pulling while the consumer is behind.
  - Cancellation: `reader.cancel()` or a caller AbortSignal forwards into an
    internal controller, stops the walk, swallows the eventual settlement of
    in-flight child promises, and settles `finished` with
    `RenderCancelledError` / abort errors. `finished` carries a default
    catch so stream-only observers never see unhandled rejections.
  - Mid-stream errors: wrapped as `StreamRenderError` with `bytesWritten` —
    after the first flush the status line is committed and no replacement
    status can be sent (documented; errors are observable, not faked).
  - `streamResponse(tree, { signal?, status?, headers? })` → `Response` with
    `text/html; charset=utf-8` carrying `finished`.
- `packages/jsx/src/index.ts` exports; README streaming section.
- `packages/jsx/test/streaming/render-to-stream.test.ts` (new, 13 tests).
- `tools/benchmark/jsx-stream.ts` (new) + `bench:jsx-stream` script; artifact
  `evidence/gh-034/jsx-stream-bench.json`.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/jsx/test/streaming/**` (as
   `bun test ./packages/jsx/test/streaming`) — exit 0; 13 tests, 0 fail.
3. `bun run bench:jsx-stream` — exit 0; streaming 500 async items p50
   1.40 ms / mean 1.54 ms vs the buffered `renderToStringAsync` baseline p50
   0.30 ms (50 iterations; the honest cost of incremental production —
   streaming's value is first-byte latency and bounded memory, not total
   time). Artifact written to `evidence/gh-034/jsx-stream-bench.json`.
4. `bun run typecheck` and `--filter @bundar/jsx typecheck` — exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 491 tests across 60 files, 0 fail, 3,265
   expect() calls.
7. `bun run architecture:check` — exit 0 (60 source files).
8. `bun run pack:inspect @bundar/jsx` — exit 0 (zero runtime dependencies).
9. `bun run build` — exit 0. `bun run docs:validate` (211 documents) and
   `docs:links` (1,090 links) — exit 0.

### Tooling decisions (planned-command substitutions)

- `bun run bench -- jsx-stream` → `bun run bench:jsx-stream` (dedicated
  micro-bench tool, same pattern as the GH-017 context bench; the GH-007
  harness measures end-to-end adapters, not the renderer in isolation).
- `bun run test:leaks -- jsx-stream` → the cancellation-release tests in the
  streaming suite are the leak tests: reader-cancel settles `finished`,
  stops the walk, and releases tracked work (a signal-aware child records
  its cancellation); the abandoned iterator's eventual settlement is
  swallowed explicitly. No separate leak runner exists in the repository.

## Acceptance evidence mapping

- "The renderer does not buffer the entire output by design" — the gated
  test reads the pre-gate prefix while the gate promise is unresolved; the
  500-item test shows segmented production (chunk count > 1) with byte-exact
  parity against `renderToStringAsync`.
- "Backpressure controls production rather than accumulating unbounded
  chunks" — the slow-consumer test pauses mid-consumption and asserts
  production did not run to completion ahead (byte-queued stream stops
  pulling past the watermark), then drains fully.
- "Cancellation releases tracked work" — cancel test (above) plus the abort
  test: a fired signal errors the stream with the abort reason and
  signal-aware children observe it.
- "Mid-stream errors are observable and do not pretend a replacement status
  can be sent after commit" — `StreamRenderError.bytesWritten` distinguishes
  committed (bytes > 0: status line gone, body truncated, `finished`
  rejects) from pre-flush failures (bytes = 0); `streamResponse` documents
  the contract and its test asserts the rejection.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — jsx README streaming section, closure record below,
  `issues/m2/index.md`, `log.md`, this transcript, bench artifact.

## Residual risks and deviations

- Non-signal-aware child promises cannot be force-cancelled (platform
  limit): cancellation stops production and settles observably, but an
  in-flight awaited promise runs to its own settlement — the walker's
  post-abort continuation is swallowed, documented in source.
- Per-segment enqueue means many small chunks for large synchronous trees;
  the byte-queued strategy and transport coalescing absorb this, and the
  benchmark records the overhead honestly.
- `chunkBytes` is the queue watermark, not an output-buffer size — output
  is never held hostage to it (flush happens per segment, before awaits).
- Unicode safety holds because segments are whole JS strings (no code point
  splits inside a segment); consumers must decode with `stream: true` across
  chunk boundaries (tested).

## Newly unblocked / dependencies

- Blocks nothing in the delivery graph. Completes another M2 prerequisite
  toward GH-036/037/038 (their remaining dependency is GH-035).
