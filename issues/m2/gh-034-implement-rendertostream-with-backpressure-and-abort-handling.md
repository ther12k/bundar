---
type: GitHub Issue Specification
title: GH-034 — Implement renderToStream with backpressure and abort handling
description: Large or async JSX trees can stream through Web Streams while respecting backpressure, cancellation, and error boundaries.
tags:
- github-issue
- m2
- jsx
- feature
- p1
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-034
  milestone: M2 — Server JSX Runtime
  labels:
  - type:feature
  - area:jsx
  - priority:p1
  - size:l
  priority: p1
  size: l
  depends_on:
  - GH-030
  - GH-033
  blocks: []
---

# GH-034 — Implement renderToStream with backpressure and abort handling

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p1`, `size:l`  
**Priority:** `P1`  
**Size:** `L`

## Outcome

Large or async JSX trees can stream through Web Streams while respecting backpressure, cancellation, and error boundaries.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement `ReadableStream` rendering with encoded chunks.
- Define flush points and behavior before/after headers are committed.
- Propagate request abort and cancel pending child work where possible.
- Add slow-consumer, disconnect, mid-stream-error, and Unicode-boundary tests.

## Out of scope

- HTMX 4 streaming partial protocol.

## Acceptance criteria

- [x] The renderer does not buffer the entire output by design.
- [x] Backpressure controls production rather than accumulating unbounded chunks.
- [x] Cancellation releases tracked work.
- [x] Mid-stream errors are observable and do not pretend a replacement status can be sent after commit.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/streaming/**
bun run bench -- jsx-stream
bun run test:leaks -- jsx-stream
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-030 — Implement async components and promised children](gh-030-implement-async-components-and-promised-children.md)
- [GH-033 — Implement renderToString and JSX Response integration](gh-033-implement-rendertostring-and-jsx-response-integration.md)

## Blocks

- None in this delivery graph.


## Suggested files

- `packages/jsx/src/render-to-stream.ts`
- `packages/jsx/src/render/stream-writer.ts`
- `packages/jsx/test/streaming/**`

## Evidence required for closure

- Source commit and pull request.
- Exact Bun, TypeScript, operating-system, browser, Bundar-package, and relevant HTMX versions.
- Exact commands with exit status and summarized output.
- Test, benchmark, trace, screenshot, API report, package, or security artifacts required by the acceptance criteria.
- Documentation and compatibility changes.
- Residual risks, deviations, and newly unblocked stable IDs.

## Implementation notes

- Follow the master agent prompt and stop on contradictory evidence rather than weakening this issue.

## Closure report template

```markdown
Stable ID: GH-034
Commit / PR:
Files changed:
Commands executed:
Evidence:
Contract/API changes:
Security/performance impact:
Remaining risks:
Documentation updated:
Newly unblocked issues:
```

## Closure report

Stable ID: GH-034
Commit / PR: merged `gh-034-render-to-stream` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/jsx/src/render-to-stream.ts` (new), `packages/jsx/src/index.ts`, `packages/jsx/README.md`, `packages/jsx/test/streaming/render-to-stream.test.ts` (new, 13 tests), `tools/benchmark/jsx-stream.ts` (new), root `package.json` (`bench:jsx-stream`), `evidence/gh-034/` (transcript + bench artifact).
Commands executed: streaming suite 13/13; `bench:jsx-stream` (p50 1.40 ms streaming vs 0.30 ms buffered baseline over 500 async items × 50 runs — incremental first byte at an honest total-time cost); root + package typecheck; lint; format; full suite 491/491; architecture (60 files); pack:inspect @bundar/jsx (zero runtime deps); build; docs validate/links — all exit 0. Tooling decisions for `bench -- jsx-stream` and `test:leaks -- jsx-stream` documented in the transcript.
Evidence: `evidence/gh-034/verification-transcript.md`; `evidence/gh-034/jsx-stream-bench.json`.
Contract/API changes: new exports in @bundar/jsx — `renderToStream`, `streamResponse`, `StreamRenderError`, `RenderCancelledError` + option/result types (`RenderStream`, `StreamingResponse`). No existing API changed.
Security/performance impact: streaming reuses the exact escaping/attribute/raw-text primitives as string rendering (byte-parity tested); backpressure bounds memory under slow consumers; cancellation and abort stop production and settle observably; `StreamRenderError.bytesWritten` prevents pretending a replacement status is possible after the status line is committed.
Remaining risks: non-signal-aware child promises run to their own settlement after cancellation (platform limit; walker continuation swallowed); per-segment chunks add measurable overhead vs buffered rendering (recorded); consumers must decode with `stream: true` across chunk boundaries (documented + tested).
Documentation updated: `packages/jsx/README.md` streaming section, this closure record, `issues/m2/index.md`, `log.md`.
Newly unblocked issues: none directly (GH-036 additionally waits on GH-035).
