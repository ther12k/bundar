---
type: GitHub Issue Specification
title: GH-076 — Build the Todo reference application
description: A compact reference app proves full page, fragments, validated create/update/delete actions, flash, OOB updates, history, and no-JS fallback.
tags:
- github-issue
- m5
- docs
- feature
- p1
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-076
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:feature
  - area:docs
  - priority:p1
  - size:l
  priority: p1
  size: l
  depends_on:
  - GH-060
  - GH-063
  - GH-075
  blocks:
  - GH-080
  - GH-093
---

# GH-076 — Build the Todo reference application

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:feature`, `area:docs`, `priority:p1`, `size:l`  
**Priority:** `P1`  
**Size:** `L`

## Outcome

A compact reference app proves full page, fragments, validated create/update/delete actions, flash, OOB updates, history, and no-JS fallback.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement deterministic in-memory or SQLite-backed Todo domain with repository interface.
- Cover create, toggle, edit, delete, filters, counts, error flows, and concurrency-safe test fixtures.
- Use only stable Bundar APIs in shared application code.
- Provide architecture walkthrough and exact commands.

## Out of scope

- Production multi-user persistence.

## Acceptance criteria

- [ ] Same app source passes htmx2, htmx4 experimental, and no-JS E2E suites.
- [ ] Every mutation has authorization/CSRF posture appropriate to the fixture.
- [ ] OOB/partial count update uses normalized update intents.
- [ ] No version-specific HTMX condition exists outside bootstrap.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:example -- todo:htmx2
bun run test:example -- todo:htmx4
bun run test:example -- todo:no-js
bun run htmx:source-diff examples/todo
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-060 — Implement progressive validated form actions](../m4/gh-060-implement-progressive-validated-form-actions.md)
- [GH-063 — Implement flash messages and out-of-band flash regions](../m4/gh-063-implement-flash-messages-and-out-of-band-flash-regions.md)
- [GH-075 — Create and verify the minimal starter template](gh-075-create-and-verify-the-minimal-starter-template.md)

## Blocks

- [GH-080 — Write getting-started, architecture, security, and HTMX migration guides](gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md)
- [GH-093 — Prove reference applications run unchanged under HTMX 4 GA](../m7/gh-093-prove-reference-applications-run-unchanged-under-htmx-4-ga.md)


## Suggested files

- `examples/todo/**`
- `docs/examples/todo.md`

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
Stable ID: GH-076
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
