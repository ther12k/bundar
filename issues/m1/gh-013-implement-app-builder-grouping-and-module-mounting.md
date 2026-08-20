---
type: GitHub Issue Specification
title: GH-013 — Implement App builder, grouping, and module mounting
description: Developers can register routes through a readable Hono-like API while Bundar retains an immutable compile model.
tags:
- github-issue
- m1
- core
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-013
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:core
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-012
  blocks:
  - GH-015
---

# GH-013 — Implement App builder, grouping, and module mounting

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:core`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Developers can register routes through a readable Hono-like API while Bundar retains an immutable compile model.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement `new App()`, HTTP verb methods, `route`, `group`, and `mount` or approved equivalents.
- Preserve registration order only where contractually relevant.
- Return predictable builder types without unbounded generic growth.
- Expose an inspectable route manifest before compilation.

## Out of scope

- Calling `Bun.serve`.
- Middleware execution.

## Acceptance criteria

- [ ] Grouped prefixes normalize correctly.
- [ ] Mounted modules do not mutate the source module.
- [ ] Builder calls produce deterministic manifests.
- [ ] Typecheck performance fixture remains within the documented budget.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/app-builder.test.ts
bun run test:types
bun run typecheck:perf
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-012 — Define route descriptor and handler types](gh-012-define-route-descriptor-and-handler-types.md)

## Blocks

- [GH-015 — Compile Bundar routes to Bun.serve native route tables](gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)


## Suggested files

- `packages/core/src/app.ts`
- `packages/core/src/module.ts`
- `packages/core/test/app-builder.test.ts`

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
Stable ID: GH-013
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
