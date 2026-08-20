---
type: GitHub Issue Specification
title: GH-020 — Implement HttpError and the global error boundary
description: Expected HTTP failures and unexpected exceptions become explicit Responses without leaking sensitive internals.
tags:
- github-issue
- m1
- core
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-020
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:core
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-017
  - GH-018
  blocks:
  - GH-022
  - GH-023
  - GH-065
---

# GH-020 — Implement HttpError and the global error boundary

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:core`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Expected HTTP failures and unexpected exceptions become explicit Responses without leaking sensitive internals.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define `HttpError`, error codes, public details, headers, and cause handling.
- Implement one global error boundary for handler and middleware failures.
- Define development versus production diagnostics and logging hook.
- Preserve already-created Response failures where contractually appropriate.

## Out of scope

- HTML page/fragment error negotiation.

## Acceptance criteria

- [ ] Expected 4xx errors produce deterministic public envelopes or HTML-neutral responses.
- [ ] Unexpected errors produce 500 without stack traces in production.
- [ ] Abort and client-disconnect errors are classified separately.
- [ ] The boundary itself has a safe fallback if custom error rendering throws.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/errors/**
NODE_ENV=production bun test packages/core/test/errors/production.test.ts
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-017 — Implement the request context contract](gh-017-implement-the-request-context-contract.md)
- [GH-018 — Implement startup-composed sync and async middleware](gh-018-implement-startup-composed-sync-and-async-middleware.md)

## Blocks

- [GH-022 — Implement not-found, method, and lifecycle terminal behavior](gh-022-implement-not-found-method-and-lifecycle-terminal-behavior.md)
- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md)
- [GH-065 — Implement page-versus-fragment error negotiation](../m4/gh-065-implement-page-versus-fragment-error-negotiation.md)


## Suggested files

- `packages/core/src/errors.ts`
- `packages/core/src/error-boundary.ts`
- `packages/core/test/errors/**`

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
Stable ID: GH-020
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
