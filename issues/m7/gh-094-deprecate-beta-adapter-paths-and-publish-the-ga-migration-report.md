---
type: GitHub Issue Specification
title: GH-094 — Deprecate beta adapter paths and publish the GA migration report
description: Users of experimental beta exports receive a precise migration path, and public docs describe only GA semantics for stable v4 support.
tags:
- github-issue
- m7
- htmx
- docs
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-094
  milestone: M7 — HTMX 4 GA Adoption
  labels:
  - type:docs
  - area:htmx
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-093
  blocks:
  - GH-095
---

# GH-094 — Deprecate beta adapter paths and publish the GA migration report

**Milestone:** M7 — HTMX 4 GA Adoption  
**Labels:** `type:docs`, `area:htmx`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Users of experimental beta exports receive a precise migration path, and public docs describe only GA semantics for stable v4 support.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Deprecate or remove beta-specific export names according to pre-1.0 policy.
- Publish beta-to-GA and htmx2-to-htmx4 reports with audit findings and exact steps.
- Update compatibility matrix, snippets, templates, and CLI diagnostics.
- Retain historical conformance artifacts without presenting them as current.

## Out of scope

- Changing default adapter before governance decision.

## Acceptance criteria

- [ ] Deprecated paths emit actionable guidance where feasible.
- [ ] All docs distinguish application-stable subset from raw HTMX migration.
- [ ] Migration command reports zero blocking findings on reference apps.
- [ ] No current page links to beta documentation as normative.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run htmx:audit examples
bun run docs:check
bun run docs:snippets
bun run links:current-sources
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-093 — Prove reference applications run unchanged under HTMX 4 GA](gh-093-prove-reference-applications-run-unchanged-under-htmx-4-ga.md)

## Blocks

- [GH-095 — Decide the default HTMX dialect after GA evidence](gh-095-decide-the-default-htmx-dialect-after-ga-evidence.md)


## Suggested files

- `docs/migrations/htmx-2-to-4.md`
- `docs/migrations/htmx4-beta-to-ga.md`
- `docs/compatibility/matrix.md`
- `packages/htmx/src/**`

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
Stable ID: GH-094
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
