---
type: GitHub Issue Specification
title: GH-030 — Implement async components and promised children
description: Components may await server data while synchronous trees preserve a non-Promise rendering path.
tags:
- github-issue
- m2
- jsx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-030
  milestone: M2 — Server JSX Runtime
  labels:
  - type:feature
  - area:jsx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-029
  blocks:
  - GH-033
  - GH-034
---

# GH-030 — Implement async components and promised children

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Components may await server data while synchronous trees preserve a non-Promise rendering path.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Detect async/promise nodes without wrapping all synchronous output in promises.
- Resolve promised children in document order.
- Propagate rejection with component context and abort signals where available.
- Define concurrency policy for sibling async components.

## Out of scope

- Streaming flush policy, handled separately.

## Acceptance criteria

- [ ] A fully synchronous tree uses the synchronous renderer path.
- [ ] Async output order is deterministic.
- [ ] Rejections reach the global/application error boundary when integrated.
- [ ] Aborted renders do not continue unbounded work.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/async/**
bun run bench -- jsx-sync
bun run bench -- jsx-async
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-029 — Implement fragments, arrays, iterables, and functional components](gh-029-implement-fragments-arrays-iterables-and-functional-components.md)

## Blocks

- [GH-033 — Implement renderToString and JSX Response integration](gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-034 — Implement renderToStream with backpressure and abort handling](gh-034-implement-rendertostream-with-backpressure-and-abort-handling.md)


## Suggested files

- `packages/jsx/src/render/async.ts`
- `packages/jsx/src/render/node.ts`
- `packages/jsx/test/async/**`

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
Stable ID: GH-030
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
