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

- [x] All compared scenarios pass behavior parity.
- [x] Raw data and environment manifest are archived.
- [x] Thresholds account for noise and do not reward unsafe disabled checks.
- [x] Release notes describe results as measured on a specific environment, not universal claims.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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

## Closure report

Stable ID: GH-083
Commit / PR: merged `gh-083-perf-budgets` into `main` (merge commit recorded in `log.md`).
Files changed: `tools/benchmark/{release,regression}.ts` (new) + `bench:release`/`bench:regression` scripts, `artifacts/bench/{alpha.json,environment.json,alpha-budgets.json}` (committed), `docs/performance/alpha.md` (new), `evidence/gh-083/verification-transcript.md`.
Commands executed: `bench:release` exit 0 (packed-candidate guard + 27 measurements + 9 parity); `bench:parity` 9/9; `bench:regression --generate` (13 budgets from 3 pooled runs); `bench:regression` exit 0 — stable across three independent probes; full suite 827/827; typecheck; lint; format; architecture; api:check; build; docs — all exit 0.
Evidence: `evidence/gh-083/verification-transcript.md`; `docs/performance/alpha.md`; `artifacts/bench/**`.
Contract/API changes: none to packages (benchmark tooling + artifacts).
Security/performance impact: none at runtime. Budgets gate only Bundar-owned ratios; parity failures void budgets; no unsafe shortcut is rewarded.
Remaining risks: budgets calibrated per machine class (regeneration documented); packed-candidate substitution recorded above.
Documentation updated: `docs/performance/alpha.md`, this closure record, `issues/m6/index.md`, `log.md`.
Newly unblocked issues: GH-087 (release notes).
