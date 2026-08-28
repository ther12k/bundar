---
type: Guide
title: Streaming
description: Stream rendering semantics - backpressure, cancellation, late-error policy, cleanup, and string/stream parity.
tags:
- guide
- streaming
- jsx
status: stable
updated: '2026-08-23'
---

# Streaming

`renderToStream(node, options)` streams server JSX with pull-based
backpressure. `options`: `signal`, `chunkBytes`
(flush granularity; the consumer is never held hostage to it).

## Policy matrix

| Situation | Behavior |
| --- | --- |
| Slow consumer | Pull-based queue bounds buffering (ByteLengthQueuingStrategy, highWaterMark = chunkBytes). Producers pause behind readers — verified by test. |
| Abort before first byte | No bytes enqueued; stream errors immediately with `AbortedRenderError`. |
| Abort after commit | In-flight traversal stops at the next checkpoint; no further enqueue; cleanup runs exactly once; error surfaces as `AbortedRenderError` (cause = signal reason). |
| Producer error BEFORE any byte | Throws out of composition — normal error boundary applies (status can still change). |
| Producer error AFTER bytes committed | Stream TERMINATES via `StreamRenderError` (`cause` = original error, `bytesWritten` correlated); **no fallback error markup is injected**; status can no longer change. Log correlation belongs to the route boundary. |
| Cleanup | Async-generator/component `finally` runs exactly once on completion, abort, or late error. |

## Parity

For deterministic trees, `renderToString(tree)` output equals the drained
stream byte-for-byte (tested with 300-row tables).

## Non-goals

SSE frameworks and WebSocket abstractions are out of scope.

Conformance evidence: `packages/jsx/test/streaming/matrix.test.tsx`.
