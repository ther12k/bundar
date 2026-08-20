---
type: GitHub Issue Specification
title: GH-024 — Run the M1 performance and resource gate
description: Core overhead is measured against equivalent raw Bun and pinned Hono scenarios, with regressions and trade-offs documented.
tags:
- github-issue
- m1
- testing
- perf
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-024
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:perf
  - area:testing
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-007
  - GH-023
  blocks:
  - GH-025
  - GH-083
---

# GH-024 — Run the M1 performance and resource gate

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:perf`, `area:testing`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Core overhead is measured against equivalent raw Bun and pinned Hono scenarios, with regressions and trade-offs documented.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run all M1 benchmark scenarios on a controlled environment.
- Measure startup, RSS, static route, parameter route, context, sync middleware, and async middleware.
- Store raw data and comparison report.
- Open optimization issues for material overhead rather than distorting APIs without evidence.

## Out of scope

- Optimizing JSX or HTMX code not yet implemented.

## Acceptance criteria

- [ ] Behavior parity tests pass before benchmark comparison.
- [ ] Environment and exact dependency versions are recorded.
- [ ] Static fast path remains near raw Bun within the reviewed tolerance.
- [ ] No absolute “fastest” claim is made from one machine.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run bench:parity
bun run bench:m1 -- --output artifacts/bench/m1.json
bun run bench:report artifacts/bench/m1.json
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-007 — Create benchmark harness with raw Bun and Hono baselines](../m0/gh-007-create-benchmark-harness-with-raw-bun-and-hono-baselines.md)
- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md)

## Blocks

- [GH-025 — Run and record the M1 HTTP-core gate](gh-025-run-and-record-the-m1-http-core-gate.md)
- [GH-083 — Run final alpha performance and regression budgets](../m6/gh-083-run-final-alpha-performance-and-regression-budgets.md)


## Suggested files

- `artifacts/bench/m1.json`
- `docs/okf/delivery/gates/m1-performance.md`

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
Stable ID: GH-024
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
