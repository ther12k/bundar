---
type: GitHub Issue Specification
title: GH-028 — Implement HTML attributes, class, style, and boolean serialization
description: Intrinsic elements serialize standards-oriented attributes predictably without React-specific browser semantics.
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
  stable_id: GH-028
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
  - GH-032
  - GH-035
---

# GH-028 — Implement HTML attributes, class, style, and boolean serialization

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Intrinsic elements serialize standards-oriented attributes predictably without React-specific browser semantics.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement attribute name validation and escaping.
- Support HTML boolean attributes, data/aria attributes, class strings/collections as approved, and a deterministic style model.
- Define `class`, `for`, namespaced attributes, and compatibility aliases deliberately.
- Reject event-handler injection and unsafe attribute names.

## Out of scope

- CSS compiler or Tailwind integration.

## Acceptance criteria

- [x] Boolean attributes serialize according to HTML semantics.
- [x] Class and style ordering is deterministic.
- [x] Attribute values cannot escape their quoting context.
- [x] Inline `on*` handlers are rejected or require an explicit unsafe API documented by ADR.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/attributes/**
bun test packages/jsx/test/security/attribute-injection.test.ts
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-027 — Implement safe text, primitive, and empty-child rendering](gh-027-implement-safe-text-primitive-and-empty-child-rendering.md)

## Blocks

- [GH-032 — Implement document, doctype, head, and void-element helpers](gh-032-implement-document-doctype-head-and-void-element-helpers.md)
- [GH-035 — Add typed common HTMX attributes without runtime coupling](gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md)


## Suggested files

- `packages/jsx/src/render/attributes.ts`
- `packages/jsx/src/types/intrinsic.ts`
- `packages/jsx/test/attributes/**`

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
Stable ID: GH-028
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
