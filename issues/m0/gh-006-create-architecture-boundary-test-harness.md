---
type: GitHub Issue Specification
title: GH-006 — Create architecture-boundary test harness
description: Automated checks prevent forbidden dependency directions, accidental runtime dependencies, browser imports in server packages, and raw HTMX parsing outside adapters.
tags:
- github-issue
- m0
- testing
- test
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-006
  milestone: M0 — Contracts & Foundation
  labels:
  - type:test
  - area:testing
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-001
  - GH-005
  blocks:
  - GH-010
---

# GH-006 — Create architecture-boundary test harness

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:test`, `area:testing`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Automated checks prevent forbidden dependency directions, accidental runtime dependencies, browser imports in server packages, and raw HTMX parsing outside adapters.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define package-layer dependency rules.
- Add import graph checks and forbidden-pattern checks.
- Add fixtures that prove each rule fails when violated.
- Make boundary reports human-readable and CI-friendly.

## Out of scope

- Runtime security testing.
- General lint rules unrelated to architecture.

## Acceptance criteria

- [ ] A core-to-HTMX dependency fails.
- [ ] A React or hydration runtime import fails.
- [ ] Raw `HX-*` header access outside approved adapter/test paths fails.
- [ ] A valid package graph passes on all supported CI platforms.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test tests/architecture
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-001 — Initialize the Bun workspace and repository skeleton](gh-001-initialize-the-bun-workspace-and-repository-skeleton.md)
- [GH-005 — Freeze public API principles and package boundaries](gh-005-freeze-public-api-principles-and-package-boundaries.md)

## Blocks

- [GH-010 — Run and record the M0 contract-freeze gate](gh-010-run-and-record-the-m0-contract-freeze-gate.md)


## Suggested files

- `tools/architecture-check/**`
- `tests/architecture/**`
- `package.json`

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
Stable ID: GH-006
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
