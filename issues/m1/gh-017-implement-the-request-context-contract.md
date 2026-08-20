---
type: GitHub Issue Specification
title: GH-017 — Implement the request context contract
description: Dynamic handlers receive a small per-request context with standard request access, native params/cookies, services, state, and response helpers.
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
  stable_id: GH-017
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:core
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-015
  blocks:
  - GH-018
  - GH-019
  - GH-020
  - GH-021
  - GH-057
---

# GH-017 — Implement the request context contract

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:core`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Dynamic handlers receive a small per-request context with standard request access, native params/cookies, services, state, and response helpers.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement context creation and documented lifetime.
- Expose immutable request, native params, URL/query access, cookies adapter, services, and typed state.
- Avoid eager body/query parsing and unnecessary object spreading.
- Define context extension ownership for middleware.

## Out of scope

- HTMX metadata and form validation.

## Acceptance criteria

- [ ] A context is created only for dynamic Bundar handlers.
- [ ] Request and native route data are not copied without reason.
- [ ] State cannot leak across concurrent requests.
- [ ] Context public shape matches the package API document.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/context.test.ts
bun test packages/core/test/concurrency/context-isolation.test.ts
bun run bench -- context
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-015 — Compile Bundar routes to Bun.serve native route tables](gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)

## Blocks

- [GH-018 — Implement startup-composed sync and async middleware](gh-018-implement-startup-composed-sync-and-async-middleware.md)
- [GH-019 — Implement params, query, and cookie access adapters](gh-019-implement-params-query-and-cookie-access-adapters.md)
- [GH-020 — Implement HttpError and the global error boundary](gh-020-implement-httperror-and-the-global-error-boundary.md)
- [GH-021 — Implement explicit response helpers](gh-021-implement-explicit-response-helpers.md)
- [GH-057 — Implement bounded form and request-body parsing](../m4/gh-057-implement-bounded-form-and-request-body-parsing.md)


## Suggested files

- `packages/core/src/context.ts`
- `packages/core/src/state.ts`
- `packages/core/test/context.test.ts`

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
Stable ID: GH-017
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
