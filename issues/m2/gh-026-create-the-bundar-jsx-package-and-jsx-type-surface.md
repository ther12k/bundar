---
type: GitHub Issue Specification
title: GH-026 — Create the @bundar/jsx package and JSX type surface
description: A zero-runtime-dependency server JSX package can be selected with `jsxImportSource` and consumed without React types.
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
  stable_id: GH-026
  milestone: M2 — Server JSX Runtime
  labels:
  - type:feature
  - area:jsx
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-010
  - GH-011
  blocks:
  - GH-027
---

# GH-026 — Create the @bundar/jsx package and JSX type surface

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

A zero-runtime-dependency server JSX package can be selected with `jsxImportSource` and consumed without React types.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create package exports for `jsx-runtime`, `jsx-dev-runtime`, renderer APIs, and intrinsic element types.
- Define JSX node, component, child, attribute, and fragment types.
- Add tsconfig and consumer fixtures for automatic and development JSX transforms.
- Document supported TypeScript/Bun JSX settings.

## Out of scope

- HTML serialization behavior beyond a compile fixture.

## Acceptance criteria

- [x] A TSX fixture compiles with `jsxImportSource: "@bundar/jsx"`.
- [x] No React package or type dependency is installed.
- [x] Runtime dependency count is zero.
- [x] Unsupported client event/property conventions produce useful type guidance.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run --filter @bundar/jsx typecheck
bun test packages/jsx
bun run test:consumer:jsx
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-010 — Run and record the M0 contract-freeze gate](../m0/gh-010-run-and-record-the-m0-contract-freeze-gate.md)
- [GH-011 — Create the @bundar/core package skeleton](../m1/gh-011-create-the-bundar-core-package-skeleton.md)

## Blocks

- [GH-027 — Implement safe text, primitive, and empty-child rendering](gh-027-implement-safe-text-primitive-and-empty-child-rendering.md)


## Suggested files

- `packages/jsx/package.json`
- `packages/jsx/src/jsx-runtime.ts`
- `packages/jsx/src/jsx-dev-runtime.ts`
- `packages/jsx/src/types.ts`
- `tests/consumer/jsx/**`

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
Stable ID: GH-026
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
