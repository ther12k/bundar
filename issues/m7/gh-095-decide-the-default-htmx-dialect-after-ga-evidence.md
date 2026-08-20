---
type: GitHub Issue Specification
title: GH-095 — Decide the default HTMX dialect after GA evidence
description: Maintainers choose whether Bundar keeps htmx 2 default or switches to htmx 4 GA using compatibility, security, maintenance, performance, and ecosystem evidence.
tags:
- github-issue
- m7
- htmx
- decision
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-095
  milestone: M7 — HTMX 4 GA Adoption
  labels:
  - type:decision
  - area:htmx
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-094
  blocks:
  - GH-096
---

# GH-095 — Decide the default HTMX dialect after GA evidence

**Milestone:** M7 — HTMX 4 GA Adoption  
**Labels:** `type:decision`, `area:htmx`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Maintainers choose whether Bundar keeps htmx 2 default or switches to htmx 4 GA using compatibility, security, maintenance, performance, and ecosystem evidence.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Compare stable-lane conformance, migration friction, feature value, browser support, extension ecosystem, package size, and maintenance cost.
- Assess impact on existing alpha users and templates.
- Define default, support window, deprecation timeline, and rollback criteria.
- Record dissent/uncertainty and exact evidence.

## Out of scope

- Release execution.

## Acceptance criteria

- [ ] Decision is not based solely on “newer is better.”
- [ ] Zero-application-change gate status is explicit.
- [ ] Security and error-handling changes are reviewed.
- [ ] Support policy names exact version ranges and review date.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run conformance:compare -- v2 v4-ga
bun run htmx:audit examples
bun run docs:validate
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-094 — Deprecate beta adapter paths and publish the GA migration report](gh-094-deprecate-beta-adapter-paths-and-publish-the-ga-migration-report.md)

## Blocks

- [GH-096 — Release stable HTMX 4 support](gh-096-release-stable-htmx-4-support.md)


## Suggested files

- `docs/okf/decisions/htmx-default-after-v4-ga.md`
- `docs/compatibility/matrix.md`

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
Stable ID: GH-095
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
