---
type: GitHub Issue Specification
title: GH-011 — Create the @bundar/core package skeleton
description: The core package builds, tests, and exports only an intentionally small placeholder surface.
tags:
- github-issue
- m1
- core
- feature
- p0
- s
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-011
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:core
  - priority:p0
  - size:s
  priority: p0
  size: s
  depends_on:
  - GH-010
  blocks:
  - GH-012
  - GH-026
---

# GH-011 — Create the @bundar/core package skeleton

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:core`, `priority:p0`, `size:s`  
**Priority:** `P0`  
**Size:** `S`

## Outcome

The core package builds, tests, and exports only an intentionally small placeholder surface.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create source, test, package export, type declaration, and build layout.
- Add runtime and type entry points with explicit Bun engine requirement.
- Add package-local scripts and API extraction/reporting hook.

## Out of scope

- App builder, routing, context, and middleware behavior.

## Acceptance criteria

- [ ] Package can be imported from a workspace consumer.
- [ ] Published files are allow-listed.
- [ ] Runtime dependency count is zero.
- [ ] No route behavior is prematurely implemented.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run --filter @bundar/core typecheck
bun test packages/core
bun run pack:inspect @bundar/core
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-010 — Run and record the M0 contract-freeze gate](../m0/gh-010-run-and-record-the-m0-contract-freeze-gate.md)

## Blocks

- [GH-012 — Define route descriptor and handler types](gh-012-define-route-descriptor-and-handler-types.md)
- [GH-026 — Create the @bundar/jsx package and JSX type surface](../m2/gh-026-create-the-bundar-jsx-package-and-jsx-type-surface.md)


## Suggested files

- `packages/core/package.json`
- `packages/core/src/index.ts`
- `packages/core/tsconfig.json`
- `packages/core/test/**`

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
Stable ID: GH-011
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
