---
type: GitHub Issue Specification
title: GH-029 — Implement fragments, arrays, iterables, and functional components
description: Server components compose ordinary values into deterministic HTML without a virtual DOM or lifecycle runtime.
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
  stable_id: GH-029
  milestone: M2 — Server JSX Runtime
  labels:
  - type:feature
  - area:jsx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-027
  blocks:
  - GH-030
  - GH-032
---

# GH-029 — Implement fragments, arrays, iterables, and functional components

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Server components compose ordinary values into deterministic HTML without a virtual DOM or lifecycle runtime.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement `Fragment`, nested arrays, approved iterables, and functional component invocation.
- Define props/children passing and error attribution.
- Flatten output without creating a client identity/key model.
- Add deep nesting and large-list tests.

## Out of scope

- Client reconciliation, hydration, signals, or component state.

## Acceptance criteria

- [x] Components are ordinary functions and have no hook lifecycle.
- [x] Nested children preserve source order.
- [x] Keys are not required for server output and do not leak as HTML.
- [x] Recursive/cyclic values fail safely with actionable diagnostics.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/components/**
bun run bench -- jsx-list
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-027 — Implement safe text, primitive, and empty-child rendering](gh-027-implement-safe-text-primitive-and-empty-child-rendering.md)

## Blocks

- [GH-030 — Implement async components and promised children](gh-030-implement-async-components-and-promised-children.md)
- [GH-032 — Implement document, doctype, head, and void-element helpers](gh-032-implement-document-doctype-head-and-void-element-helpers.md)


## Suggested files

- `packages/jsx/src/jsx-runtime.ts`
- `packages/jsx/src/render/node.ts`
- `packages/jsx/test/components/**`

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
Stable ID: GH-029
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
