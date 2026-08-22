---
type: GitHub Issue Specification
title: GH-037 — Run the M2 JSX performance and memory gate
description: String and stream renderer costs are measured against equivalent Hono JSX/reference output with behavior parity.
tags:
- github-issue
- m2
- testing
- perf
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-037
  milestone: M2 — Server JSX Runtime
  labels:
  - type:perf
  - area:testing
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-007
  - GH-036
  blocks:
  - GH-038
  - GH-083
---

# GH-037 — Run the M2 JSX performance and memory gate

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:perf`, `area:testing`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

String and stream renderer costs are measured against equivalent Hono JSX/reference output with behavior parity.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Benchmark small fragments, full documents, large lists, nested components, async components, escaping, and streaming.
- Record allocations or memory proxies available in Bun.
- Separate first-render/startup from steady-state throughput.
- Identify optimizations that preserve security and readability.

## Out of scope

- Cross-framework marketing claims from microbenchmarks alone.

## Acceptance criteria

- [x] Compared outputs are semantically equivalent before timing.
- [x] Raw data, environment, and exact package commits are retained.
- [x] Escaping cannot be disabled to meet a benchmark.
- [x] Regression budgets are reviewed and documented.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run bench:parity -- jsx
bun run bench:m2 -- --output artifacts/bench/m2.json
bun run bench:report artifacts/bench/m2.json
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-007 — Create benchmark harness with raw Bun and Hono baselines](../m0/gh-007-create-benchmark-harness-with-raw-bun-and-hono-baselines.md)
- [GH-036 — Close JSX conformance, security, and snapshot coverage](gh-036-close-jsx-conformance-security-and-snapshot-coverage.md)

## Blocks

- [GH-038 — Run and record the M2 server-JSX gate](gh-038-run-and-record-the-m2-server-jsx-gate.md)
- [GH-083 — Run final alpha performance and regression budgets](../m6/gh-083-run-final-alpha-performance-and-regression-budgets.md)


## Suggested files

- `artifacts/bench/m2.json`
- `docs/okf/delivery/gates/m2-performance.md`

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
Stable ID: GH-037
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

Stable ID: GH-037
Commit / PR: merged `gh-037-m2-jsx-perf` into `main` (merge commit recorded in `log.md`).
Files changed: `tools/benchmark/m2-jsx.ts` (new) + `bench:m2` script, `tools/benchmark/report.ts` (gate-dispatched reporting), `tools/benchmark/runner.ts` (stats helpers exported), `packages/jsx/src/render/async.ts` (parity defect fixed: async renderer now honors void and raw-text elements exactly like the sync renderer), `delivery/gates/m2-performance.md` (new) + delivery index, `artifacts/bench/m2.json` (committed artifact), `evidence/gh-037/verification-transcript.md` (new).
Commands executed: `bench:m2` (14 measurements, parity pre-checked); `bench:report` for m2 and m1 artifacts; jsx suite 146/146; full repo 516/516; typechecks; lint; format; architecture; pack:inspect; build; docs — all exit 0. Tooling decision: renderer parity is enforced fail-closed inside the gate before timing (stronger than the planned separate `bench:parity -- jsx`).
Evidence: `evidence/gh-037/verification-transcript.md`; `artifacts/bench/m2.json`; `delivery/gates/m2-performance.md`.
Contract/API changes: none public — the async-renderer fix makes output byte-identical to the sync contract (void elements never close; raw-text serialized); `bench:report` gained an artifact-dispatch branch.
Security/performance impact: escaping presence is asserted in every timed output (cannot be disabled for numbers); recorded baseline p50s: fragment 1.1µs steady, document 5.5µs, 1000-item list ~1.08ms, streaming async list ~3.51ms (documented ~3× streaming overhead); budgets: steady ≤ 1.5× baseline at GH-083, parity and escaping absolute.
Remaining risks: single-machine baseline with run variance (raw samples retained); memory proxies advisory; nested-components cold/steady inversion retained honestly.
Documentation updated: gate record + index, this closure record, `issues/m2/index.md`, `log.md`.
Newly unblocked issues: GH-038 (and the M2 baseline for GH-083).
