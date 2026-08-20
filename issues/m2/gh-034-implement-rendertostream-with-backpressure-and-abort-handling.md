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

- [ ] The renderer does not buffer the entire output by design.
- [ ] Backpressure controls production rather than accumulating unbounded chunks.
- [ ] Cancellation releases tracked work.
- [ ] Mid-stream errors are observable and do not pretend a replacement status can be sent after commit.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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
