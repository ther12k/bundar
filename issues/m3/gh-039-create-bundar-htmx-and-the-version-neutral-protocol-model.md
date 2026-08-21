---
type: GitHub Issue Specification
title: GH-039 — Create @bundar/htmx and the version-neutral protocol model
description: A dedicated package owns hypermedia semantics without importing Bundar core or hard-coding one HTMX generation throughout the framework.
tags:
- github-issue
- m3
- htmx
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-039
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-010
  - GH-005
  blocks:
  - GH-040
---

# GH-039 — Create @bundar/htmx and the version-neutral protocol model

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

A dedicated package owns hypermedia semantics without importing Bundar core or hard-coding one HTMX generation throughout the framework.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create package exports for neutral contracts, htmx2 adapter, htmx4 adapter, assets, and optional JSX type augmentation.
- Define package dependency direction and experimental export policy.
- Add exact peer/optional dependency policy for official htmx assets.
- Create consumer fixtures that import neutral and versioned paths independently.

## Out of scope

- Request parsing and response encoding behavior.

## Acceptance criteria

- [x] Core and JSX do not import `@bundar/htmx`.
- [x] Applications can select a dialect through one explicit adapter value/import.
- [x] Experimental v4 exports are visibly marked and version-pinned.
- [x] Package metadata does not claim htmx 4 GA support.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run --filter @bundar/htmx typecheck
bun test packages/htmx
bun run architecture:check
bun run pack:inspect @bundar/htmx
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-010 — Run and record the M0 contract-freeze gate](../m0/gh-010-run-and-record-the-m0-contract-freeze-gate.md)
- [GH-005 — Freeze public API principles and package boundaries](../m0/gh-005-freeze-public-api-principles-and-package-boundaries.md)

## Blocks

- [GH-040 — Define the HTMX dialect adapter interface](gh-040-define-the-htmx-dialect-adapter-interface.md)


## Suggested files

- `packages/htmx/package.json`
- `packages/htmx/src/index.ts`
- `packages/htmx/src/v2.ts`
- `packages/htmx/src/v4.ts`
- `tests/consumer/htmx/**`

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
Stable ID: GH-039
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
