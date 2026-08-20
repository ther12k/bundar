---
type: GitHub Issue Specification
title: GH-058 — Implement the Standard Schema validation adapter
description: Bundar validates params, query, headers, forms, and JSON through an optional Standard Schema-compatible package without choosing a mandatory validator.
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
  stable_id: GH-058
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:feature
  - area:forms
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-005
  - GH-057
  blocks:
  - GH-059
---

# GH-058 — Implement the Standard Schema validation adapter

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:feature`, `area:forms`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Bundar validates params, query, headers, forms, and JSON through an optional Standard Schema-compatible package without choosing a mandatory validator.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create `@bundar/schema` or approved package and adapter types.
- Support synchronous and asynchronous schemas where the standard permits.
- Define input-source mapping, coercion responsibility, and typed validated values.
- Add consumer fixtures for at least two compatible validators without runtime dependencies in core.

## Out of scope

- Building a new schema language.

## Acceptance criteria

- [ ] Core functions without schema package installed.
- [ ] Validation errors remain normalized without losing library-specific details behind an explicit escape hatch.
- [ ] A schema cannot cause double body consumption.
- [ ] Type inference is tested in an external consumer.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/schema
bun run test:consumer:schema
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-005 — Freeze public API principles and package boundaries](../m0/gh-005-freeze-public-api-principles-and-package-boundaries.md)
- [GH-057 — Implement bounded form and request-body parsing](gh-057-implement-bounded-form-and-request-body-parsing.md)

## Blocks

- [GH-059 — Define validation results and field-error rendering data](gh-059-define-validation-results-and-field-error-rendering-data.md)


## Suggested files

- `packages/schema/**`
- `tests/consumer/schema/**`
- `docs/guides/validation.md`

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
Stable ID: GH-058
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
