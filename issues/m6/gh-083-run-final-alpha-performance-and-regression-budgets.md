---
type: GitHub Issue Specification
title: GH-083 — Run final alpha performance and regression budgets
description: The first alpha has reproducible startup, memory, routing, JSX, form, and representative-app performance evidence with reviewed regression budgets.
tags:
- github-issue
- m6
- testing
- perf
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-083
  milestone: M6 — Alpha Readiness
  labels:
  - type:perf
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-024
  - GH-037
  - GH-082
  blocks:
  - GH-087
---

# GH-083 — Run final alpha performance and regression budgets

**Milestone:** M6 — Alpha Readiness  
**Labels:** `type:perf`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

The first alpha has reproducible startup, memory, routing, JSX, form, and representative-app performance evidence with reviewed regression budgets.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run all benchmark suites from packed release candidates.
- Compare to raw Bun and pinned Hono parity fixtures.
- Record startup distributions, RSS, throughput/latency, renderer cost, and representative workflow results.
- Define alert and fail thresholds from observed variance.

## Out of scope

- Claiming leadership from synthetic requests per second alone.

## Acceptance criteria

- [ ] All compared scenarios pass behavior parity.
- [ ] Raw data and environment manifest are archived.
- [ ] Thresholds account for noise and do not reward unsafe disabled checks.
- [ ] Release notes describe results as measured on a specific environment, not universal claims.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run bench:release -- --output artifacts/bench/alpha.json
bun run bench:parity
bun run bench:regression
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-024 — Run the M1 performance and resource gate](../m1/gh-024-run-the-m1-performance-and-resource-gate.md)
- [GH-037 — Run the M2 JSX performance and memory gate](../m2/gh-037-run-the-m2-jsx-performance-and-memory-gate.md)
- [GH-082 — Run the complete dual-dialect end-to-end matrix](gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)

## Blocks

- [GH-087 — Write alpha release notes, compatibility statement, and known limitations](gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md)


## Suggested files

- `artifacts/bench/alpha.json`
- `artifacts/bench/environment.json`
- `docs/performance/alpha.md`

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
Stable ID: GH-083
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
