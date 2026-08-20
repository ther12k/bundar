---
type: GitHub Issue Specification
title: GH-018 — Implement startup-composed sync and async middleware
description: Middleware executes in a predictable onion lifecycle and is composed once at compile time with a preserved synchronous fast path.
tags:
- github-issue
- m1
- middleware
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-018
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:middleware
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-017
  blocks:
  - GH-020
  - GH-023
  - GH-061
  - GH-062
  - GH-066
  - GH-067
---

# GH-018 — Implement startup-composed sync and async middleware

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:middleware`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Middleware executes in a predictable onion lifecycle and is composed once at compile time with a preserved synchronous fast path.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define middleware signature, scope, ordering, and next-call rules.
- Compose global, group, module, and route middleware during application compilation.
- Support sync and async middleware without forcing every route through a Promise when all participants are synchronous.
- Detect double `next()` and missing terminal responses.

## Out of scope

- A large named lifecycle-hook matrix.

## Acceptance criteria

- [ ] Ordering and unwind behavior are covered by deterministic tests.
- [ ] Double `next()` fails clearly.
- [ ] Sync-only route instrumentation reports no framework-created Promise path.
- [ ] Middleware scope cannot silently cross mounted module boundaries.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/middleware/**
bun run bench -- middleware-sync
bun run bench -- middleware-async
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-017 — Implement the request context contract](gh-017-implement-the-request-context-contract.md)

## Blocks

- [GH-020 — Implement HttpError and the global error boundary](gh-020-implement-httperror-and-the-global-error-boundary.md)
- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md)
- [GH-061 — Implement CSRF primitives and form middleware](../m4/gh-061-implement-csrf-primitives-and-form-middleware.md)
- [GH-062 — Define secure cookie and session integration interfaces](../m4/gh-062-define-secure-cookie-and-session-integration-interfaces.md)
- [GH-066 — Implement security headers, CSP, and nonce propagation](../m4/gh-066-implement-security-headers-csp-and-nonce-propagation.md)
- [GH-067 — Implement request budgets, timeouts, and abort propagation](../m4/gh-067-implement-request-budgets-timeouts-and-abort-propagation.md)


## Suggested files

- `packages/core/src/middleware.ts`
- `packages/core/src/compiler.ts`
- `packages/core/test/middleware/**`

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
Stable ID: GH-018
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
