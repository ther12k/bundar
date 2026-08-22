---
type: GitHub Issue Specification
title: GH-025 — Run and record the M1 HTTP-core gate
description: Maintainers accept the Bun-native HTTP core as the stable foundation for JSX and HTMX layers.
tags:
- github-issue
- m1
- release
- release
- p0
- s
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-025
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:s
  priority: p0
  size: s
  depends_on:
  - GH-023
  - GH-024
  blocks: []
---

# GH-025 — Run and record the M1 HTTP-core gate

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:s`  
**Priority:** `P0`  
**Size:** `S`

## Outcome

Maintainers accept the Bun-native HTTP core as the stable foundation for JSX and HTMX layers.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run M1 CI, API, architecture, package, and performance gates.
- Review deviations from M0 contracts.
- Record exact commit, Bun version, evidence, open risks, and approved API changes.
- Authorize M2 and M3 dependent work.

## Out of scope

- JSX and HTMX release claims.

## Acceptance criteria

- [x] No second router or forbidden package edge exists.
- [x] All core tests and package inspections pass.
- [x] Performance evidence is reviewed.
- [x] Any public API exception has an ADR and migration note.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run ci:m1
bun run architecture:check
bun run pack:inspect @bundar/core
bun run api:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md)
- [GH-024 — Run the M1 performance and resource gate](gh-024-run-the-m1-performance-and-resource-gate.md)

## Blocks

- None in this delivery graph.


## Suggested files

- `docs/okf/delivery/gates/m1.md`
- `docs/okf/log.md`

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
Stable ID: GH-025
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

Stable ID: GH-025
Commit / PR: merged `gh-025-m1-http-core-gate` into `main` (merge commit recorded in `log.md`).
Files changed: `scripts/m1-gate.ts` (new), `tools/api-check.ts` (new), `tools/api-report.ts` (renderer extracted), `package.json` (`ci:m1`, `api:check`), `delivery/gates/m1.md` (new), `delivery/index.md`, `evidence/gh-025/verification-transcript.md` (new), this closure record.
Commands executed: `bun run ci:m1` (28/28 steps exit 0 — superset of ci:m0 covering CI, API, architecture, package, and performance gates); `bun run api:check`; `bun run docs:validate`; `bun run docs:links`; `bun run format:check` — all exit 0.
Evidence: `evidence/gh-025/verification-transcript.md`; gate record `delivery/gates/m1.md`; `artifacts/bench/m1.json` (tolerance re-checked inside the battery); `artifacts/api/core.md` (byte-checked by `api:check`); per-issue transcripts GH-011–GH-024.
Contract/API changes: none to public APIs. Tooling additions: `ci:m1` and `api:check` scripts. Reviewed M0 deviations (CLI workspace dependency, benchmark schema 1→2, new scripts) recorded in the gate record with no ADR required.
Security/performance impact: package boundaries machine-enforced (architecture check 46 files / 7 rules; zero runtime deps for core/jsx via pack:inspect); raw-HTML audit green; static fast-path tolerance 0.65× ≤ 2.0× verified inside the battery.
Remaining risks: single-machine benchmark variance; `request.params` tied to Bun's documented contract (detected by the matrix, not prevented); production error opacity depends on deploy-time `NODE_ENV`; browser lanes are harness smokes, not HTMX/JSX release claims.
Documentation updated: `delivery/gates/m1.md`, `delivery/index.md`, `issues/m1/index.md`, `log.md`, this closure report.
Newly unblocked issues: GH-034, GH-035 (immediately); GH-036–038 and GH-045–056 authorized on this foundation. M1 milestone complete.
