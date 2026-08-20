---
type: GitHub Issue Specification
title: GH-009 — Configure GitHub labels, milestones, project fields, and automation
description: Generated stable-ID tasks can be created and managed in GitHub without losing dependency and evidence metadata.
tags:
- github-issue
- m0
- repo
- chore
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-009
  milestone: M0 — Contracts & Foundation
  labels:
  - type:chore
  - area:repo
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-002
  - GH-003
  blocks:
  - GH-010
---

# GH-009 — Configure GitHub labels, milestones, project fields, and automation

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:chore`, `area:repo`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Generated stable-ID tasks can be created and managed in GitHub without losing dependency and evidence metadata.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create documented labels and eight milestones.
- Configure project fields and views for stable ID, priority, size, area, dependencies, evidence, and upstream blocking.
- Add issue and pull-request templates.
- Document bulk issue creation and stable-ID-to-number mapping.

## Out of scope

- Assigning calendar due dates without capacity data.

## Acceptance criteria

- [ ] Labels and milestones match the OKF configuration exactly.
- [ ] Issue creation does not rely on guessed GitHub issue numbers.
- [ ] Dependency links remain readable before and after GitHub-native relationships are added.
- [ ] Automation never closes an issue merely because a PR merged without acceptance evidence.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
gh label list
gh api repos/{owner}/{repo}/milestones
bun run docs:validate
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-002 — Add governance, licensing, security, and contribution foundations](gh-002-add-governance-licensing-security-and-contribution-foundations.md)
- [GH-003 — Install the OKF documentation corpus and local validator](gh-003-install-the-okf-documentation-corpus-and-local-validator.md)

## Blocks

- [GH-010 — Run and record the M0 contract-freeze gate](gh-010-run-and-record-the-m0-contract-freeze-gate.md)


## Suggested files

- `.github/ISSUE_TEMPLATE/**`
- `.github/pull_request_template.md`
- `.github/workflows/project.yml`
- `docs/okf/github/**`

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
Stable ID: GH-009
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
