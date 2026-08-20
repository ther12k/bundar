---
type: GitHub Issue Specification
title: GH-069 — Run the M4 progressive-workflow security gate
description: Maintainers approve a representative authenticated, validated, progressive workflow as a safe foundation for examples and alpha packaging.
tags:
- github-issue
- m4
- release
- release
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-069
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-068
  blocks:
  - GH-071
  - GH-079
  - GH-082
---

# GH-069 — Run the M4 progressive-workflow security gate

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Maintainers approve a representative authenticated, validated, progressive workflow as a safe foundation for examples and alpha packaging.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Build and execute a sample create/edit/delete workflow with session, CSRF, validation, flash, uploads where applicable, and error handling.
- Run both HTMX lanes and no-JS fallback.
- Review threat model, security defaults, and residual limitations.
- Record commit, versions, evidence, and release-blocking findings.

## Out of scope

- General authentication product or user management UI.

## Acceptance criteria

- [ ] Workflow source is shared across browser modes.
- [ ] Authorization is server-side and independent of HTMX metadata.
- [ ] All M4 mandatory gates pass.
- [ ] No security limitation is hidden behind example-only assumptions.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run ci:m4
bun run test:reference-workflow
bun run security:report
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)

## Blocks

- [GH-071 — Implement create-bundar scaffolding](../m5/gh-071-implement-create-bundar-scaffolding.md)
- [GH-079 — Publish generated API reference and compatibility documentation source](../m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md)
- [GH-082 — Run the complete dual-dialect end-to-end matrix](../m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)


## Suggested files

- `examples/workflow-gate/**`
- `docs/okf/delivery/gates/m4.md`
- `docs/okf/log.md`

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
Stable ID: GH-069
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
