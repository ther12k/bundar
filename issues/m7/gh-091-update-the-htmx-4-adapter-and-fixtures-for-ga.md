---
type: GitHub Issue Specification
title: GH-091 — Update the HTMX 4 adapter and fixtures for GA
description: The v4 adapter targets the exact GA contract while preserving the normalized stable subset or explicitly versioning any unavoidable change.
tags:
- github-issue
- m7
- htmx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-091
  milestone: M7 — HTMX 4 GA Adoption
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-090
  blocks:
  - GH-092
---

# GH-091 — Update the HTMX 4 adapter and fixtures for GA

**Milestone:** M7 — HTMX 4 GA Adoption  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

The v4 adapter targets the exact GA contract while preserving the normalized stable subset or explicitly versioning any unavoidable change.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Update request decoding, response encoding, capabilities, events, inheritance, history, error, partial, streaming, extension, and asset behavior as required by the impact matrix.
- Replace beta asset pins and maturity metadata with GA data.
- Update unit/protocol fixtures and compatibility documentation.
- Keep v2 adapter behavior unchanged except shared-contract fixes proven safe.

## Out of scope

- Changing the default adapter.

## Acceptance criteria

- [ ] All GA profile unit tests pass.
- [ ] Experimental beta assumptions are removed or retained only in a deprecated compatibility path.
- [ ] Stable subset changes require accepted ADR and migration note.
- [ ] v2 regression suite remains green.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/v4
bun test packages/htmx/test/v2
bun run htmx:profile-report -- v4-ga
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-090 — Diff the HTMX 4 beta adapter against the GA contract](gh-090-diff-the-htmx-4-beta-adapter-against-the-ga-contract.md)

## Blocks

- [GH-092 — Run dual-version regression CI against HTMX 2 and HTMX 4 GA](gh-092-run-dual-version-regression-ci-against-htmx-2-and-htmx-4-ga.md)


## Suggested files

- `packages/htmx/src/dialects/v4/**`
- `packages/htmx/test/v4/**`
- `docs/compatibility/htmx4.md`

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
Stable ID: GH-091
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
