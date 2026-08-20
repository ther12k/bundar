---
type: GitHub Issue Specification
title: GH-023 — Close the HTTP core integration and contract test matrix
description: The complete M1 surface is covered by unit, integration, type, concurrency, malformed-input, and real Bun server tests.
tags:
- github-issue
- m1
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-023
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-016
  - GH-018
  - GH-019
  - GH-020
  - GH-021
  - GH-022
  blocks:
  - GH-024
  - GH-025
  - GH-074
---

# GH-023 — Close the HTTP core integration and contract test matrix

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

The complete M1 surface is covered by unit, integration, type, concurrency, malformed-input, and real Bun server tests.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create a contract fixture covering static, dynamic, parameter, wildcard, grouped, mounted, middleware, error, and terminal flows.
- Test request isolation and concurrent handling.
- Add API snapshot and package export tests.
- Record platform-specific deviations instead of conditional silent skips.

## Out of scope

- JSX and HTMX behavior.

## Acceptance criteria

- [ ] All public M1 behavior maps to at least one test.
- [ ] Race/isolation tests run repeatedly without shared-state leakage.
- [ ] Type declarations are consumed by an external fixture.
- [ ] No test command suppresses failures.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core
bun run test:integration:core
bun run test:types
bun run api:report @bundar/core
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-016 — Preserve the static Response fast path](gh-016-preserve-the-static-response-fast-path.md)
- [GH-018 — Implement startup-composed sync and async middleware](gh-018-implement-startup-composed-sync-and-async-middleware.md)
- [GH-019 — Implement params, query, and cookie access adapters](gh-019-implement-params-query-and-cookie-access-adapters.md)
- [GH-020 — Implement HttpError and the global error boundary](gh-020-implement-httperror-and-the-global-error-boundary.md)
- [GH-021 — Implement explicit response helpers](gh-021-implement-explicit-response-helpers.md)
- [GH-022 — Implement not-found, method, and lifecycle terminal behavior](gh-022-implement-not-found-method-and-lifecycle-terminal-behavior.md)

## Blocks

- [GH-024 — Run the M1 performance and resource gate](gh-024-run-the-m1-performance-and-resource-gate.md)
- [GH-025 — Run and record the M1 HTTP-core gate](gh-025-run-and-record-the-m1-http-core-gate.md)
- [GH-074 — Implement the in-process test client and request helpers](../m5/gh-074-implement-the-in-process-test-client-and-request-helpers.md)


## Suggested files

- `packages/core/test/**`
- `tests/consumer/core/**`
- `artifacts/api/core.md`

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
Stable ID: GH-023
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
