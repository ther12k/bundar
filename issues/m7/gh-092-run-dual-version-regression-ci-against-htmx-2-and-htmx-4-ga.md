---
type: GitHub Issue Specification
title: GH-092 — Run dual-version regression CI against HTMX 2 and HTMX 4 GA
description: The complete shared conformance suite runs against stable htmx 2 and htmx 4 GA with no hidden beta lane.
tags:
- github-issue
- m7
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-092
  milestone: M7 — HTMX 4 GA Adoption
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-082
  - GH-091
  blocks:
  - GH-093
---

# GH-092 — Run dual-version regression CI against HTMX 2 and HTMX 4 GA

**Milestone:** M7 — HTMX 4 GA Adoption  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

The complete shared conformance suite runs against stable htmx 2 and htmx 4 GA with no hidden beta lane.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Replace experimental v4 browser project with GA-pinned lane while preserving historical beta report.
- Run protocol, browser, no-JS, security, history, errors, partials/updates, streaming, and extension compatibility tests.
- Publish cross-dialect machine-readable comparison.
- Update CI required checks and exact upstream version matrix.

## Out of scope

- Default-selection decision.

## Acceptance criteria

- [ ] Both stable lanes pass mandatory stable-subset scenarios.
- [ ] No blanket allow-failure remains for v4.
- [ ] Any capability difference has explicit conditional fixture outside shared application code.
- [ ] Raw traces and asset hashes are archived.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:browser:htmx2
bun run test:browser:htmx4-ga
bun run conformance:compare -- v2 v4-ga
bun run test:security
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-082 — Run the complete dual-dialect end-to-end matrix](../m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)
- [GH-091 — Update the HTMX 4 adapter and fixtures for GA](gh-091-update-the-htmx-4-adapter-and-fixtures-for-ga.md)

## Blocks

- [GH-093 — Prove reference applications run unchanged under HTMX 4 GA](gh-093-prove-reference-applications-run-unchanged-under-htmx-4-ga.md)


## Suggested files

- `tests/browser/htmx4/**`
- `.github/workflows/conformance.yml`
- `artifacts/conformance/htmx4-ga.json`

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
Stable ID: GH-092
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
