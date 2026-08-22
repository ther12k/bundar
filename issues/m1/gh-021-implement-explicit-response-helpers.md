---
type: GitHub Issue Specification
title: GH-021 — Implement explicit response helpers
description: Handlers can construct common standards-based responses while the return contract remains explicit `Response`.
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
  stable_id: GH-021
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
  - GH-022
  - GH-023
  - GH-033
  - GH-045
---

# GH-021 — Implement explicit response helpers

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:core`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Handlers can construct common standards-based responses while the return contract remains explicit `Response`.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Add text, JSON, HTML-string, redirect, empty, file/delegation, and header composition helpers as approved.
- Ensure helpers return native `Response` instances.
- Define safe header merge and multi-value behavior.
- Avoid automatic conversion of arbitrary handler return values.

## Out of scope

- JSX rendering and HTMX response headers.

## Acceptance criteria

- [x] Every helper has status/header/body tests.
- [x] Redirect defaults use documented status semantics.
- [x] Set-Cookie and Vary composition do not collapse values incorrectly.
- [x] Type tests reject unsupported convenience return types.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/responses/**
bun run test:types
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-017 — Implement the request context contract](gh-017-implement-the-request-context-contract.md)

## Blocks

- [GH-022 — Implement not-found, method, and lifecycle terminal behavior](gh-022-implement-not-found-method-and-lifecycle-terminal-behavior.md)
- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md)
- [GH-033 — Implement renderToString and JSX Response integration](../m2/gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-045 — Implement the HTMX asset registry and local serving contract](../m3/gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md)


## Suggested files

- `packages/core/src/response.ts`
- `packages/core/test/responses/**`

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
Stable ID: GH-021
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
