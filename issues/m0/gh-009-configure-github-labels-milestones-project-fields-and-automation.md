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

- [x] Labels and milestones match the OKF configuration exactly.
- [x] Issue creation does not rely on guessed GitHub issue numbers.
- [x] Dependency links remain readable before and after GitHub-native relationships are added.
- [x] Automation never closes an issue merely because a PR merged without acceptance evidence.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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

## Closure record (2026-08-21)

Stable ID: GH-009
Commit / PR: branch `gh-009-github-project-automation`; no separate PR required in this session; pushed through the repository's `main` workflow after verification.
Files changed: `.github/ISSUE_TEMPLATE/implementation.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/pull_request_template.md`, `.github/project-fields.json`, `.github/project-automation.yml`, `github/configuration-manifest.json`, `evidence/gh-009/verification-transcript.md`, `scripts/docs-check.ts`, `log.md`.
Live configuration: public project `https://github.com/users/ther12k/projects/3`, 96 items, 8 milestones, required custom fields, six requested views, and unsafe auto-close/PR-merged workflows removed.
Commands executed: `bun run docs:validate`, `bun run docs:check`, template/config syntax checks, `gh project create/edit/link`, `gh project field-create`, `gh project item-add`, GraphQL view creation/update, GraphQL workflow deletion, and project field population for all 96 issues. All required commands exited 0.
Evidence: `evidence/gh-009/verification-transcript.md`; live mapping in `github/configuration-manifest.json`.
Contract/API changes: repository issue and PR templates now enforce stable IDs, evidence, dependency metadata, and governance checks; no framework runtime API changes.
Security/performance impact: public issues now direct vulnerability reports to private GitHub advisories; unsafe project auto-close behavior removed.
Remaining risks: project ownership is the user account `ther12k`, not a future maintainer organization; GitHub native status supports Todo/In Progress/Done only, with review represented by PR linkage/template.
Documentation updated: `github/configuration-manifest.json`, `.github/project-fields.json`, `log.md`, this closure record.
Newly unblocked issues: GH-010 remains gated on GH-007 and GH-008.
