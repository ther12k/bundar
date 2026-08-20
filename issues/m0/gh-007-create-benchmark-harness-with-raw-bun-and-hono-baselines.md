---
type: GitHub Issue Specification
title: GH-007 — Create benchmark harness with raw Bun and Hono baselines
description: Performance decisions use reproducible workloads and raw data rather than framework marketing claims.
tags:
- github-issue
- m0
- testing
- perf
- p1
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-007
  milestone: M0 — Contracts & Foundation
  labels:
  - type:perf
  - area:testing
  - priority:p1
  - size:l
  priority: p1
  size: l
  depends_on:
  - GH-001
  - GH-005
  blocks:
  - GH-010
  - GH-024
  - GH-037
---

# GH-007 — Create benchmark harness with raw Bun and Hono baselines

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:perf`, `area:testing`, `priority:p1`, `size:l`  
**Priority:** `P1`  
**Size:** `L`

## Outcome

Performance decisions use reproducible workloads and raw data rather than framework marketing claims.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create startup, memory, static response, parameter route, middleware, JSX, fragment, and validated-form scenarios.
- Add raw Bun baseline and a pinned Hono reference implementation with equivalent behavior.
- Capture environment, warmup, repetitions, percentiles, confidence or variability, and raw outputs.
- Separate microbenchmarks from representative app workloads.

## Out of scope

- Declaring Bundar faster than Hono or raw Bun before implementation evidence exists.

## Acceptance criteria

- [ ] Scenarios have behavior-parity assertions before timing.
- [ ] Harness does not use localhost networking where in-process timing is intended, and clearly labels network tests.
- [ ] Results are stored as artifacts and never hard-coded as passing claims.
- [ ] Regression thresholds can be configured only after a baseline is reviewed.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run bench:smoke
bun run bench:parity
bun run bench -- --output artifacts/bench.json
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-001 — Initialize the Bun workspace and repository skeleton](gh-001-initialize-the-bun-workspace-and-repository-skeleton.md)
- [GH-005 — Freeze public API principles and package boundaries](gh-005-freeze-public-api-principles-and-package-boundaries.md)

## Blocks

- [GH-010 — Run and record the M0 contract-freeze gate](gh-010-run-and-record-the-m0-contract-freeze-gate.md)
- [GH-024 — Run the M1 performance and resource gate](../m1/gh-024-run-the-m1-performance-and-resource-gate.md)
- [GH-037 — Run the M2 JSX performance and memory gate](../m2/gh-037-run-the-m2-jsx-performance-and-memory-gate.md)


## Suggested files

- `benchmarks/**`
- `tools/benchmark/**`
- `docs/okf/engineering/performance-budgets.md`

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
Stable ID: GH-007
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
