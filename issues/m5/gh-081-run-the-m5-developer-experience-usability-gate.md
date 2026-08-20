---
type: GitHub Issue Specification
title: GH-081 — Run the M5 developer-experience usability gate
description: A fresh user workflow proves that the CLI, template, examples, typed routes, testing tools, and documentation can be followed without maintainer knowledge.
tags:
- github-issue
- m5
- testing
- test
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-081
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-080
  blocks:
  - GH-082
  - GH-084
---

# GH-081 — Run the M5 developer-experience usability gate

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

A fresh user workflow proves that the CLI, template, examples, typed routes, testing tools, and documentation can be followed without maintainer knowledge.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define a clean-environment scripted journey from scaffold to tested form feature.
- Run at least one maintainer-blind review or simulated fresh checkout.
- Measure install/setup steps, typecheck latency, error clarity, and documentation gaps.
- Resolve P0/P1 usability blockers or record blocking issues.

## Out of scope

- Broad community survey before public alpha.

## Acceptance criteria

- [ ] The scripted journey succeeds from packed artifacts, not workspace-only imports.
- [ ] A user can identify and fix a deliberate route/schema error from diagnostics.
- [ ] Both dialect selection paths are documented; v4 remains experimental.
- [ ] No hidden global tool or unpublished package is required.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:dx-cleanroom
bun run test:pack-consumers
bun run docs:snippets
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-080 — Write getting-started, architecture, security, and HTMX migration guides](gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md)

## Blocks

- [GH-082 — Run the complete dual-dialect end-to-end matrix](../m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)
- [GH-084 — Audit package contents, dependencies, licenses, and size](../m6/gh-084-audit-package-contents-dependencies-licenses-and-size.md)


## Suggested files

- `tests/dx/**`
- `artifacts/dx/m5-report.md`
- `docs/okf/delivery/gates/m5.md`

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
Stable ID: GH-081
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
