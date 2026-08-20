---
type: GitHub Issue Specification
title: GH-052 — Implement redirect, location, and history helpers
description: Server navigation semantics remain consistent for normal and enhanced requests without open redirects or version-specific handler code.
tags:
- github-issue
- m3
- htmx
- feature
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-052
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-042
  - GH-043
  - GH-044
  - GH-050
  blocks:
  - GH-055
---

# GH-052 — Implement redirect, location, and history helpers

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Server navigation semantics remain consistent for normal and enhanced requests without open redirects or version-specific handler code.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement local redirect/location builders and history push/replace controls.
- Normalize relative URL resolution and allowed-origin policy.
- Define when ordinary Location and HTMX headers are emitted.
- Add status and client-behavior fixtures for both dialects.

## Out of scope

- Application authorization decisions.

## Acceptance criteria

- [ ] External redirects are denied by default or require explicit allow-listing.
- [ ] Normal fallback uses standards-compliant redirect responses.
- [ ] Enhanced navigation preserves the requested history semantics.
- [ ] Header conflicts and malformed URLs fail closed.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/navigation/**
bun run test:browser:dual -- navigation
bun run security:redirects
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-042 — Implement normalized HTMX response directives](gh-042-implement-normalized-htmx-response-directives.md)
- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)
- [GH-050 — Implement the progressive action response composer](gh-050-implement-the-progressive-action-response-composer.md)

## Blocks

- [GH-055 — Build the unchanged-source dual-dialect reference fixture](gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md)


## Suggested files

- `packages/htmx/src/navigation.ts`
- `packages/htmx/test/navigation/**`

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
Stable ID: GH-052
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
