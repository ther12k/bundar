---
type: GitHub Issue Specification
title: GH-019 — Implement params, query, and cookie access adapters
description: Common request data is available through standards-based, lazy, documented adapters without schema or proxy magic.
tags:
- github-issue
- m1
- core
- feature
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-019
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:core
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-017
  blocks:
  - GH-023
  - GH-062
---

# GH-019 — Implement params, query, and cookie access adapters

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:core`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Common request data is available through standards-based, lazy, documented adapters without schema or proxy magic.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Expose native route params with typed access.
- Provide lazy URLSearchParams-based query helpers including repeated values.
- Wrap Bun/native cookies minimally and document signed-cookie deferral.
- Define malformed URL and cookie behavior.

## Out of scope

- Session storage and signed cookies.

## Acceptance criteria

- [ ] Repeated query keys are not silently collapsed.
- [ ] Params reflect Bun decoding semantics and tests record edge cases.
- [ ] Cookie mutations affect the eventual response through an explicit mechanism.
- [ ] No body parsing occurs when only params/query/cookies are used.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/request-data/**
bun run bench -- request-data
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-017 — Implement the request context contract](gh-017-implement-the-request-context-contract.md)

## Blocks

- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md)
- [GH-062 — Define secure cookie and session integration interfaces](../m4/gh-062-define-secure-cookie-and-session-integration-interfaces.md)


## Suggested files

- `packages/core/src/request/params.ts`
- `packages/core/src/request/query.ts`
- `packages/core/src/request/cookies.ts`
- `packages/core/test/request-data/**`

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
Stable ID: GH-019
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
