---
type: GitHub Issue Specification
title: GH-016 — Preserve the static Response fast path
description: Literal `Response` route entries reach Bun unchanged and do not allocate Bundar context or middleware machinery.
tags:
- github-issue
- m1
- routing
- perf
- p1
- s
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-016
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:perf
  - area:routing
  - priority:p1
  - size:s
  priority: p1
  size: s
  depends_on:
  - GH-015
  blocks:
  - GH-023
---

# GH-016 — Preserve the static Response fast path

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:perf`, `area:routing`, `priority:p1`, `size:s`  
**Priority:** `P1`  
**Size:** `S`

## Outcome

Literal `Response` route entries reach Bun unchanged and do not allocate Bundar context or middleware machinery.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Pass immutable/static response descriptors through to the native table.
- Reject incompatible middleware or dynamic metadata on static entries.
- Add allocation/path instrumentation tests and benchmark scenario.
- Document when a static response becomes a handler.

## Out of scope

- Promising zero allocations inside Bun itself.

## Acceptance criteria

- [x] Object identity or equivalent inspection proves pass-through behavior.
- [x] No Bundar handler closure is introduced for a pure static route.
- [x] Behavior matches raw Bun for status, headers, and body.
- [x] Benchmark artifact records overhead versus raw Bun.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/routing/static-fast-path.test.ts
bun run bench -- static-response
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-015 — Compile Bundar routes to Bun.serve native route tables](gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)

## Blocks

- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md)


## Suggested files

- `packages/core/src/routing/compiler.ts`
- `packages/core/test/routing/static-fast-path.test.ts`
- `benchmarks/scenarios/static-response.ts`

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
Stable ID: GH-016
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
