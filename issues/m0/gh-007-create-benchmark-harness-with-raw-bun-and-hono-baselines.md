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

- [x] Scenarios have behavior-parity assertions before timing.
- [x] Harness does not use localhost networking where in-process timing is intended, and clearly labels network tests.
- [x] Results are stored as artifacts and never hard-coded as passing claims.
- [x] Regression thresholds can be configured only after a baseline is reviewed.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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

## Closure record (2026-08-21)

Stable ID: GH-007
Commit / PR: branch `gh-007-benchmark-harness`; no GitHub remote yet for this branch.
Files changed: `tools/benchmark/{types.ts,scenarios.ts,adapters.ts,runner.ts,smoke.ts,parity.ts}`, `tests/benchmark/benchmark.test.ts`, `benchmarks/README.md`, `benchmarks/{raw-bun,hono,bundar}/README.md`, root `package.json` and `bun.lock` (Hono 4.13.3 dev dependency), `.gitignore`, `evidence/gh-007/{bench.json,summary.json,verification-transcript.md}`, `log.md`.
Commands executed: `bun run bench:smoke`, `bun run bench:parity`, `bun run bench -- --warmup 10 --iterations 50 --output evidence/gh-007/bench.json`, `bun run format:check`, `bun run docs:validate`, `bun run docs:check`, `bun run architecture:check`, `bun test` (31/31), `bun run build`, `bun install --frozen-lockfile` — all exit 0.
Evidence: raw JSON report and summary under `evidence/gh-007/`; transcript in `evidence/gh-007/verification-transcript.md`.
Contract/API changes: benchmark tooling only; no runtime package API changes; Hono is a dev-only comparator dependency.
Security/performance impact: no network listener used; raw samples retained; no thresholds or speed claims configured; Bundar comparator explicitly deferred with 501 until M1/M2.
Remaining risks: CPU model/governor unavailable from portable Bun API; network/slow-client workloads remain future gate work.
Documentation updated: benchmark README and comparator READMEs, `log.md`, this closure record.
Newly unblocked issues: GH-010 remains blocked by GH-008; GH-024 and GH-037 receive the benchmark harness.
