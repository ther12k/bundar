---
type: GitHub Issue Specification
title: GH-014 — Implement path normalization and route-conflict detection
description: Invalid, ambiguous, or duplicate route declarations fail before the server starts.
tags:
- github-issue
- m1
- routing
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-014
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:routing
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-012
  blocks:
  - GH-015
---

# GH-014 — Implement path normalization and route-conflict detection

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:routing`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Invalid, ambiguous, or duplicate route declarations fail before the server starts.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Normalize prefixes, slash joining, root routes, and supported wildcard syntax.
- Detect duplicate path/method pairs and incompatible static/handler entries.
- Produce diagnostics containing both declaration sites where available.
- Document Bun-native precedence that Bundar intentionally preserves.

## Out of scope

- Inventing route patterns Bun cannot natively represent.

## Acceptance criteria

- [ ] Duplicate registrations fail deterministically.
- [ ] Equivalent normalized paths cannot bypass collision detection.
- [ ] Valid method-specific routes share a path.
- [ ] Diagnostics do not expose absolute user paths in normal production output.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/routing/conflicts.test.ts
bun test packages/core/test/routing/paths.test.ts
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-012 — Define route descriptor and handler types](gh-012-define-route-descriptor-and-handler-types.md)

## Blocks

- [GH-015 — Compile Bundar routes to Bun.serve native route tables](gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)


## Suggested files

- `packages/core/src/routing/path.ts`
- `packages/core/src/routing/conflicts.ts`
- `packages/core/test/routing/**`

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
Stable ID: GH-014
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
