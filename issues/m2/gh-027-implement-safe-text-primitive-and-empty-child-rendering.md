---
type: GitHub Issue Specification
title: GH-027 — Implement safe text, primitive, and empty-child rendering
description: Primitive JSX children render deterministic HTML text with correct escaping and nullish/boolean omission rules.
tags:
- github-issue
- m2
- jsx
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-027
  milestone: M2 — Server JSX Runtime
  labels:
  - type:feature
  - area:jsx
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-026
  blocks:
  - GH-028
  - GH-029
  - GH-031
---

# GH-027 — Implement safe text, primitive, and empty-child rendering

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Primitive JSX children render deterministic HTML text with correct escaping and nullish/boolean omission rules.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement escaping for text nodes and attribute-ready primitives.
- Define rendering of strings, numbers, bigint if supported, null, undefined, true, and false.
- Reject unsupported values with diagnostics instead of accidental `[object Object]` output.
- Add Unicode and hostile-input fixtures.

## Out of scope

- Raw trusted HTML.
- Streaming.

## Acceptance criteria

- [ ] `&`, `<`, `>`, quotes where relevant, and Unicode are handled correctly.
- [ ] Nullish and boolean children follow the approved omission contract.
- [ ] Unsafe strings cannot break out of text context.
- [ ] Property-based/fuzz fixtures cover delimiter combinations.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/text-rendering.test.ts
bun test packages/jsx/test/fuzz/escaping.test.ts
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-026 — Create the @bundar/jsx package and JSX type surface](gh-026-create-the-bundar-jsx-package-and-jsx-type-surface.md)

## Blocks

- [GH-028 — Implement HTML attributes, class, style, and boolean serialization](gh-028-implement-html-attributes-class-style-and-boolean-serialization.md)
- [GH-029 — Implement fragments, arrays, iterables, and functional components](gh-029-implement-fragments-arrays-iterables-and-functional-components.md)
- [GH-031 — Implement explicit raw HTML and trust-boundary controls](gh-031-implement-explicit-raw-html-and-trust-boundary-controls.md)


## Suggested files

- `packages/jsx/src/escape.ts`
- `packages/jsx/src/render/primitive.ts`
- `packages/jsx/test/text-rendering.test.ts`

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
Stable ID: GH-027
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
