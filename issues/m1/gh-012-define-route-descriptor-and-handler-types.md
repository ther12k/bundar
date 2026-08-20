---
type: GitHub Issue Specification
title: GH-012 — Define route descriptor and handler types
description: Route definitions have a minimal typed model for methods, paths, handlers, static responses, metadata, and compile-time parameter inference.
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
  stable_id: GH-012
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:routing
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-011
  blocks:
  - GH-013
  - GH-014
  - GH-073
---

# GH-012 — Define route descriptor and handler types

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:routing`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Route definitions have a minimal typed model for methods, paths, handlers, static responses, metadata, and compile-time parameter inference.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define supported HTTP methods and route descriptor unions.
- Model `Response` static entries separately from callable handlers.
- Infer literal path parameters without a runtime schema requirement.
- Define metadata extension points that do not affect dispatch.

## Out of scope

- Runtime route compilation.
- Automatic body parsing.

## Acceptance criteria

- [ ] Literal `/users/:id` exposes `id` as a string parameter.
- [ ] Wildcard and optional/unsupported patterns have documented behavior.
- [ ] A handler must return `Response | Promise<Response>`.
- [ ] Type tests reject invalid methods and duplicate method declarations in one descriptor.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/types/route-descriptor.test-d.ts
bun run typecheck
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-011 — Create the @bundar/core package skeleton](gh-011-create-the-bundar-core-package-skeleton.md)

## Blocks

- [GH-013 — Implement App builder, grouping, and module mounting](gh-013-implement-app-builder-grouping-and-module-mounting.md)
- [GH-014 — Implement path normalization and route-conflict detection](gh-014-implement-path-normalization-and-route-conflict-detection.md)
- [GH-073 — Generate route manifests and typed URL builders](../m5/gh-073-generate-route-manifests-and-typed-url-builders.md)


## Suggested files

- `packages/core/src/routing/types.ts`
- `packages/core/test/types/**`
- `docs/okf/engineering/package-api.md`

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
Stable ID: GH-012
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
