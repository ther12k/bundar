---
type: GitHub Issue Specification
title: GH-060 — Implement progressive validated form actions
description: One server action handles valid and invalid submissions for normal browsers and HTMX-enhanced flows with identical business validation.
tags:
- github-issue
- m4
- forms
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-060
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:feature
  - area:forms
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-050
  - GH-059
  blocks:
  - GH-068
  - GH-076
  - GH-077
---

# GH-060 — Implement progressive validated form actions

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:feature`, `area:forms`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

One server action handles valid and invalid submissions for normal browsers and HTMX-enhanced flows with identical business validation.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Compose form parsing, schema validation, invalid fragment/page rendering, successful action result, and PRG fallback.
- Define status semantics for invalid normal and enhanced responses.
- Preserve user-entered safe values and focus/error targeting hints.
- Provide transaction boundary hooks without owning database behavior.

## Out of scope

- Database-specific transaction implementation.

## Acceptance criteria

- [ ] A no-JS invalid submission returns a usable page with errors.
- [ ] An enhanced invalid submission replaces only the form/error region.
- [ ] The valid path executes exactly once and returns approved action semantics.
- [ ] No JSON client code is required for field errors.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/schema/test/progressive-action.test.ts
bun run test:browser:dual -- validated-form
bun run test:browser:no-js -- validated-form
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-050 — Implement the progressive action response composer](../m3/gh-050-implement-the-progressive-action-response-composer.md)
- [GH-059 — Define validation results and field-error rendering data](gh-059-define-validation-results-and-field-error-rendering-data.md)

## Blocks

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)
- [GH-076 — Build the Todo reference application](../m5/gh-076-build-the-todo-reference-application.md)
- [GH-077 — Build the Admin CRUD reference application](../m5/gh-077-build-the-admin-crud-reference-application.md)


## Suggested files

- `packages/schema/src/action.ts`
- `packages/htmx/src/form-action.ts`
- `tests/browser/forms/**`

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
Stable ID: GH-060
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
