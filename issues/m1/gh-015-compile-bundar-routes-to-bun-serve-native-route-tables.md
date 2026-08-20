---
type: GitHub Issue Specification
title: GH-015 — Compile Bundar routes to Bun.serve native route tables
description: The application compiler emits a `Bun.serve`-compatible configuration without a second request-time router.
tags:
- github-issue
- m1
- routing
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-015
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:routing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-013
  - GH-014
  blocks:
  - GH-016
  - GH-017
  - GH-022
  - GH-072
  - GH-073
---

# GH-015 — Compile Bundar routes to Bun.serve native route tables

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:routing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

The application compiler emits a `Bun.serve`-compatible configuration without a second request-time router.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Compile static responses and method handlers into `routes` entries.
- Generate unmatched `fetch` behavior and global error integration points.
- Expose `app.compile()` and optionally `app.serve()` with explicit ownership.
- Add manifest-to-config snapshots and real Bun integration tests.

## Out of scope

- Starting multiple workers or deployment orchestration.

## Acceptance criteria

- [ ] Route matching is performed by Bun for compiled paths.
- [ ] No linear application route scan appears in request handlers.
- [ ] Compiled configuration is deterministic.
- [ ] Unsupported constructs fail at compile time with actionable messages.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/routing/compiler.test.ts
bun test packages/core/test/integration/native-routing.test.ts
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-013 — Implement App builder, grouping, and module mounting](gh-013-implement-app-builder-grouping-and-module-mounting.md)
- [GH-014 — Implement path normalization and route-conflict detection](gh-014-implement-path-normalization-and-route-conflict-detection.md)

## Blocks

- [GH-016 — Preserve the static Response fast path](gh-016-preserve-the-static-response-fast-path.md)
- [GH-017 — Implement the request context contract](gh-017-implement-the-request-context-contract.md)
- [GH-022 — Implement not-found, method, and lifecycle terminal behavior](gh-022-implement-not-found-method-and-lifecycle-terminal-behavior.md)
- [GH-072 — Implement the Bundar development command and reload loop](../m5/gh-072-implement-the-bundar-development-command-and-reload-loop.md)
- [GH-073 — Generate route manifests and typed URL builders](../m5/gh-073-generate-route-manifests-and-typed-url-builders.md)


## Suggested files

- `packages/core/src/compiler.ts`
- `packages/core/src/routing/compiler.ts`
- `packages/core/test/integration/native-routing.test.ts`

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
Stable ID: GH-015
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
