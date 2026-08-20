---
type: GitHub Issue Specification
title: GH-051 — Implement version-neutral out-of-band and partial update intents
description: Applications describe multi-region updates once while adapters choose OOB or newer partial mechanisms based on capability and policy.
tags:
- github-issue
- m3
- htmx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-051
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-035
  - GH-043
  - GH-044
  - GH-050
  blocks:
  - GH-055
  - GH-063
---

# GH-051 — Implement version-neutral out-of-band and partial update intents

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Applications describe multi-region updates once while adapters choose OOB or newer partial mechanisms based on capability and policy.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define update intents by stable DOM region identity and swap operation.
- Implement htmx 2 OOB serialization.
- Implement htmx 4 OOB/partial strategy according to the pinned profile.
- Define fallback, ordering, duplicate-target, and unsupported-mode diagnostics.

## Out of scope

- General client-side state synchronization.

## Acceptance criteria

- [ ] A counter and list row update uses identical application source in both lanes.
- [ ] Generated HTML is valid and target IDs/selectors are explicit.
- [ ] Adapter does not silently change destructive versus additive swap meaning.
- [ ] Raw dialect markup is reported by compatibility audit.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/updates/**
bun run test:browser:dual -- multi-region
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-035 — Add typed common HTMX attributes without runtime coupling](../m2/gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md)
- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)
- [GH-050 — Implement the progressive action response composer](gh-050-implement-the-progressive-action-response-composer.md)

## Blocks

- [GH-055 — Build the unchanged-source dual-dialect reference fixture](gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md)
- [GH-063 — Implement flash messages and out-of-band flash regions](../m4/gh-063-implement-flash-messages-and-out-of-band-flash-regions.md)


## Suggested files

- `packages/htmx/src/updates.ts`
- `packages/htmx/src/oob.tsx`
- `packages/htmx/test/updates/**`

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
Stable ID: GH-051
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
