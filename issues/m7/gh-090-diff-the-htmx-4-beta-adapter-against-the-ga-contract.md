---
type: GitHub Issue Specification
title: GH-090 — Diff the HTMX 4 beta adapter against the GA contract
description: A reviewed impact matrix identifies every GA change affecting Bundar’s normalized contract, adapter, tests, examples, docs, and stable subset.
tags:
- github-issue
- m7
- htmx
- decision
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-090
  milestone: M7 — HTMX 4 GA Adoption
  labels:
  - type:decision
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-089
  blocks:
  - GH-091
---

# GH-090 — Diff the HTMX 4 beta adapter against the GA contract

**Milestone:** M7 — HTMX 4 GA Adoption  
**Labels:** `type:decision`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

A reviewed impact matrix identifies every GA change affecting Bundar’s normalized contract, adapter, tests, examples, docs, and stable subset.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Diff beta6 source snapshot and fixtures against GA.
- Classify each change as no impact, adapter-only, capability change, stable-subset break, application-visible break, or upstream defect.
- Decide whether the current dialect interface remains sufficient.
- Open scoped blocker/ADR issues for interface changes instead of hiding them in implementation.

## Out of scope

- Implementing the changes.

## Acceptance criteria

- [ ] All recorded beta migration assumptions have a GA disposition.
- [ ] Request/response headers, events, inheritance, history, errors, extensions, partials, and streaming are explicitly covered.
- [ ] Potential application-source changes are treated as gate failures until resolved.
- [ ] Decision names exact evidence and owners.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run htmx:contract-diff -- beta6 ga
bun run conformance:fixture-diff
bun run docs:validate
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-089 — Record the official HTMX 4 GA source snapshot](gh-089-record-the-official-htmx-4-ga-source-snapshot.md)

## Blocks

- [GH-091 — Update the HTMX 4 adapter and fixtures for GA](gh-091-update-the-htmx-4-adapter-and-fixtures-for-ga.md)


## Suggested files

- `docs/compatibility/htmx4-ga-impact.md`
- `artifacts/upstream/htmx4-contract-diff.json`
- `docs/okf/decisions/htmx4-ga-impact.md`

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
Stable ID: GH-090
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
