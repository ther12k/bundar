---
type: GitHub Issue Specification
title: GH-022 — Implement not-found, method, and lifecycle terminal behavior
description: Unmatched paths, unsupported methods, HEAD/OPTIONS behavior, and shutdown ownership are deterministic and documented.
tags:
- github-issue
- m1
- routing
- feature
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-022
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:routing
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-015
  - GH-020
  - GH-021
  blocks:
  - GH-023
---

# GH-022 — Implement not-found, method, and lifecycle terminal behavior

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:routing`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Unmatched paths, unsupported methods, HEAD/OPTIONS behavior, and shutdown ownership are deterministic and documented.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement application not-found fallback through Bun fetch.
- Define 404 versus 405 behavior based on what Bun exposes reliably.
- Specify HEAD and OPTIONS defaults without masking explicit routes.
- Expose startup/listen/stop hooks only where Bun semantics are stable.

## Out of scope

- Custom router-level method negotiation unsupported by native Bun evidence.

## Acceptance criteria

- [x] Unknown path returns configured 404.
- [x] Explicit method handlers are not shadowed by defaults.
- [x] HEAD behavior has parity tests with GET where applicable.
- [x] Server ownership and stop behavior do not leave resources open in tests.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/integration/terminal-behavior.test.ts
bun test packages/core/test/integration/server-lifecycle.test.ts
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-015 — Compile Bundar routes to Bun.serve native route tables](gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)
- [GH-020 — Implement HttpError and the global error boundary](gh-020-implement-httperror-and-the-global-error-boundary.md)
- [GH-021 — Implement explicit response helpers](gh-021-implement-explicit-response-helpers.md)

## Blocks

- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md)


## Suggested files

- `packages/core/src/compiler.ts`
- `packages/core/src/server.ts`
- `packages/core/test/integration/**`

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
Stable ID: GH-022
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
