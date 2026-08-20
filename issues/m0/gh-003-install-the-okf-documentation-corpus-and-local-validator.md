---
type: GitHub Issue Specification
title: GH-003 — Install the OKF documentation corpus and local validator
description: Architecture, requirements, ADRs, issues, and evidence can be versioned as a locally validated OKF v0.2 bundle.
tags:
- github-issue
- m0
- docs
- docs
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-003
  milestone: M0 — Contracts & Foundation
  labels:
  - type:docs
  - area:docs
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-001
  blocks:
  - GH-005
  - GH-009
---

# GH-003 — Install the OKF documentation corpus and local validator

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:docs`, `area:docs`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Architecture, requirements, ADRs, issues, and evidence can be versioned as a locally validated OKF v0.2 bundle.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Import the design bundle under a stable documentation path.
- Implement a local validator for root metadata, concept frontmatter, reserved files, internal links, issue IDs, and dependency cycles.
- Add documentation validation to local scripts and CI.

## Out of scope

- Claiming certification by Google or any third party.

## Acceptance criteria

- [ ] Every non-reserved Markdown concept has parseable frontmatter and a non-empty type.
- [ ] Reserved index and log files follow OKF conventions.
- [ ] Broken links, duplicate stable issue IDs, missing dependencies, and cycles fail validation.
- [ ] Validation output states that it is local structural validation, not external certification.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run docs:validate
bun run docs:links
bun run issues:graph
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-001 — Initialize the Bun workspace and repository skeleton](gh-001-initialize-the-bun-workspace-and-repository-skeleton.md)

## Blocks

- [GH-005 — Freeze public API principles and package boundaries](gh-005-freeze-public-api-principles-and-package-boundaries.md)
- [GH-009 — Configure GitHub labels, milestones, project fields, and automation](gh-009-configure-github-labels-milestones-project-fields-and-automation.md)


## Suggested files

- `docs/okf/**`
- `tools/okf-validator/**`
- `package.json`
- `.github/workflows/docs.yml`

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
Stable ID: GH-003
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
