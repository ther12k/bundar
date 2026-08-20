---
type: GitHub Issue Specification
title: GH-065 — Implement page-versus-fragment error negotiation
description: Validation, authorization, not-found, conflict, and unexpected errors render into the correct page or fragment target under both dialects and no-JS fallback.
tags:
- github-issue
- m4
- htmx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-065
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-020
  - GH-048
  - GH-059
  blocks:
  - GH-068
---

# GH-065 — Implement page-versus-fragment error negotiation

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Validation, authorization, not-found, conflict, and unexpected errors render into the correct page or fragment target under both dialects and no-JS fallback.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define error presentation result separate from exception classification.
- Select full error documents, local form errors, modal/region errors, or empty responses by explicit policy.
- Handle htmx 2 versus htmx 4 error-swap differences through adapters.
- Provide safe retarget/reswap hints without trusting client target as authorization.

## Out of scope

- Application-specific branded error designs.

## Acceptance criteria

- [ ] A 422 form error updates the intended region in both lanes.
- [ ] A 401/403 flow cannot expose protected fragment content.
- [ ] An unexpected 500 returns a safe full-page or fragment response and logs correlation data.
- [ ] Normal browser behavior remains usable.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/error-negotiation/**
bun run test:browser:dual -- errors
bun run test:browser:no-js -- errors
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-020 — Implement HttpError and the global error boundary](../m1/gh-020-implement-httperror-and-the-global-error-boundary.md)
- [GH-048 — Implement full-page and fragment negotiation](../m3/gh-048-implement-full-page-and-fragment-negotiation.md)
- [GH-059 — Define validation results and field-error rendering data](gh-059-define-validation-results-and-field-error-rendering-data.md)

## Blocks

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)


## Suggested files

- `packages/htmx/src/error-view.ts`
- `packages/htmx/test/error-negotiation/**`
- `tests/browser/errors/**`

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
Stable ID: GH-065
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
