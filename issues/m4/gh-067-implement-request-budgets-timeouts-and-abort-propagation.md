---
type: GitHub Issue Specification
title: GH-067 — Implement request budgets, timeouts, and abort propagation
description: Handlers, parsers, middleware, async JSX, and streams observe request cancellation and enforce configurable execution/resource budgets.
tags:
- github-issue
- m4
- core
- security
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-067
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:security
  - area:core
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-018
  - GH-057
  blocks:
  - GH-068
---

# GH-067 — Implement request budgets, timeouts, and abort propagation

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:security`, `area:core`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Handlers, parsers, middleware, async JSX, and streams observe request cancellation and enforce configurable execution/resource budgets.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define request deadline/timeout middleware and budget context.
- Propagate AbortSignal into parsing, renderer, and user hooks where APIs allow.
- Classify timeout, abort, server-shutdown, and client-disconnect outcomes.
- Add slowloris/body, slow handler, slow renderer, and disconnect fixtures.

## Out of scope

- Hard sandboxing of trusted application code.

## Acceptance criteria

- [ ] Timed-out work does not continue indefinitely in controlled fixtures.
- [ ] Abort does not become a generic 500 when the response is no longer writable.
- [ ] Limits can be overridden per route only within server maximums.
- [ ] Resource cleanup is verified.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/budgets/**
bun run test:browser:abort
bun run test:leaks -- request-budgets
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-018 — Implement startup-composed sync and async middleware](../m1/gh-018-implement-startup-composed-sync-and-async-middleware.md)
- [GH-057 — Implement bounded form and request-body parsing](gh-057-implement-bounded-form-and-request-body-parsing.md)

## Blocks

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)


## Suggested files

- `packages/core/src/budget.ts`
- `packages/core/test/budgets/**`
- `tests/browser/abort/**`

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
Stable ID: GH-067
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
