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

- [x] Behavior parity tests pass before benchmark comparison.
- [x] Environment and exact dependency versions are recorded.
- [x] Static fast path remains near raw Bun within the reviewed tolerance.
- [x] No absolute “fastest” claim is made from one machine.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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

## Closure report

Stable ID: GH-024
Commit / PR: merged `gh-024-m1-perf-gate` into `main` (merge commit recorded in `log.md`).
Files changed: `tools/benchmark/{bundar-app.ts,startup-probe.ts,report.ts,adapters.ts,runner.ts,types.ts,parity.ts}`, `tests/benchmark/benchmark.test.ts`, `package.json`, `artifacts/bench/m1.json` (new), `delivery/gates/m1-performance.md` (new), `delivery/index.md`, `evidence/gh-024/verification-transcript.md` (new).
Commands executed: `bun run bench:parity`; `bun run bench:m1`; `bun run bench:report artifacts/bench/m1.json`; format/lint/typecheck; `bun test` (352/352); `bun run architecture:check`; `bun run docs:validate`; `bun run docs:links`; `bun run issues:graph`; `bun run build` — all exit 0. Exact outputs in the transcript.
Evidence: `artifacts/bench/m1.json` (schema 2: 27 timed results, 9 parity results, raw samples, startup/RSS probes); `evidence/gh-024/verification-transcript.md`; gate record `delivery/gates/m1-performance.md`.
Contract/API changes: none (benchmark tooling only). Report schema version moved 1→2 (bundar adapter results + resources section added).
Security/performance impact: static fast path 0.65×–1.22× raw-bun p50 across runs (reviewed ceiling 2.0× enforced fail-closed by `bench:report`); HTTP-core scenarios 0.58×–1.29×; `parseForm` overhead ~2.5× raw tracked as optimization issue #97; startup +~8ms and RSS +~9MiB one-time per process.
Remaining risks: single-machine variance; in-process table lookup stands in for Bun's native dispatch (disclosed); `cpuModel` not portable via Bun API (recorded in transcript from `/proc/cpuinfo`).
Documentation updated: `delivery/gates/m1-performance.md`, `delivery/index.md`, this closure report, `log.md`.
Newly unblocked issues: GH-025 (M1 HTTP-core gate), feeds GH-083 (M6 final budgets).
