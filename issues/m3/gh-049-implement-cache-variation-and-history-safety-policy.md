---
type: GitHub Issue Specification
title: GH-049 — Implement cache variation and history safety policy
description: Caches and browser history cannot confuse full documents, fragments, dialect-specific representations, or authenticated content.
tags:
- github-issue
- m3
- htmx
- security
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-049
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:security
  - area:htmx
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-043
  - GH-044
  - GH-048
  blocks: []
---

# GH-049 — Implement cache variation and history safety policy

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:security`, `area:htmx`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Caches and browser history cannot confuse full documents, fragments, dialect-specific representations, or authenticated content.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define and implement `Vary` composition for relevant HTMX request headers.
- Define cache-control defaults and opt-ins for page/fragment responses.
- Handle htmx 2 local history and htmx 4 history differences explicitly.
- Add proxy-cache fixtures that reproduce representation poisoning risks.

## Out of scope

- A production CDN integration package.

## Acceptance criteria

- [ ] Page and fragment variants never overwrite each other in the test cache.
- [ ] Existing Vary values are merged without loss.
- [ ] Authenticated/private responses remain private unless explicitly overridden.
- [ ] History restore scenarios pass in both lanes or are capability-gated.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/cache/**
bun run test:browser:dual -- history
bun run security:cache
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)
- [GH-048 — Implement full-page and fragment negotiation](gh-048-implement-full-page-and-fragment-negotiation.md)

## Blocks

- None in this delivery graph.


## Suggested files

- `packages/htmx/src/cache-policy.ts`
- `packages/htmx/test/cache/**`
- `tests/proxy-cache/**`

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
Stable ID: GH-049
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
