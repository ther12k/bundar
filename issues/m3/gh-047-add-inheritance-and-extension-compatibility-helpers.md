---
type: GitHub Issue Specification
title: GH-047 — Add inheritance and extension compatibility helpers
description: Version-sensitive inheritance and extension usage is explicit, testable, and detectable during migration.
tags:
- github-issue
- m3
- htmx
- feature
- p1
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-047
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p1
  - size:l
  priority: p1
  size: l
  depends_on:
  - GH-035
  - GH-040
  - GH-043
  - GH-044
  blocks:
  - GH-078
---

# GH-047 — Add inheritance and extension compatibility helpers

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p1`, `size:l`  
**Priority:** `P1`  
**Size:** `L`

## Outcome

Version-sensitive inheritance and extension usage is explicit, testable, and detectable during migration.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Model stable intent for inherited attributes where feasible.
- Provide v2 and v4 encoding/diagnostics for implicit versus explicit inheritance.
- Define extension registration capability and raw extension escape hatch.
- Add fixtures for official htmx-2-compat behavior as a temporary migration reference.

## Out of scope

- Guaranteeing third-party extension compatibility.

## Acceptance criteria

- [ ] Bundar does not assume implicit inheritance in neutral components.
- [ ] The v2 adapter can preserve v2 behavior while the v4 adapter emits explicit configuration where approved.
- [ ] Unsupported extension patterns produce migration diagnostics.
- [ ] Compatibility extension use is optional and visible, never silently injected.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/inheritance/**
bun test packages/htmx/test/extensions/**
bun run test:browser:dual -- inheritance
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-035 — Add typed common HTMX attributes without runtime coupling](../m2/gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md)
- [GH-040 — Define the HTMX dialect adapter interface](gh-040-define-the-htmx-dialect-adapter-interface.md)
- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)

## Blocks

- [GH-078 — Implement the HTMX 2-to-4 audit and migration linter](../m5/gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md)


## Suggested files

- `packages/htmx/src/inheritance.ts`
- `packages/htmx/src/extensions.ts`
- `packages/htmx/test/inheritance/**`

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
Stable ID: GH-047
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
