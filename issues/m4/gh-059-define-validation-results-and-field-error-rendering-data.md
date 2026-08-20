---
type: GitHub Issue Specification
title: GH-059 — Define validation results and field-error rendering data
description: Invalid submissions produce stable field/global error data that can be rendered as HTML without a JSON round trip.
tags:
- github-issue
- m4
- forms
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-059
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:feature
  - area:forms
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-033
  - GH-058
  blocks:
  - GH-060
  - GH-065
---

# GH-059 — Define validation results and field-error rendering data

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:feature`, `area:forms`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Invalid submissions produce stable field/global error data that can be rendered as HTML without a JSON round trip.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define normalized issue path, code, message, source, and submitted-value handling.
- Map flat and nested form keys deliberately.
- Provide helpers for field errors, error summaries, and retaining safe input values.
- Redact passwords, secrets, tokens, and uploaded content by policy.

## Out of scope

- Opinionated visual styling.

## Acceptance criteria

- [ ] Multiple errors per field are preserved.
- [ ] Global/form-level errors are distinct from field errors.
- [ ] Sensitive values never appear in logs or default rendered models.
- [ ] Error ordering is deterministic and accessible summary links can target fields.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/schema/test/issues/**
bun test packages/jsx/test/forms/error-summary.test.tsx
bun run security:validation-redaction
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-033 — Implement renderToString and JSX Response integration](../m2/gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-058 — Implement the Standard Schema validation adapter](gh-058-implement-the-standard-schema-validation-adapter.md)

## Blocks

- [GH-060 — Implement progressive validated form actions](gh-060-implement-progressive-validated-form-actions.md)
- [GH-065 — Implement page-versus-fragment error negotiation](gh-065-implement-page-versus-fragment-error-negotiation.md)


## Suggested files

- `packages/schema/src/issues.ts`
- `packages/jsx/src/forms/error-summary.tsx`
- `packages/schema/test/issues/**`

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
Stable ID: GH-059
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
