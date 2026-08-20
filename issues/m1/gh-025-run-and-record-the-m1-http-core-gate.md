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

- [ ] No second router or forbidden package edge exists.
- [ ] All core tests and package inspections pass.
- [ ] Performance evidence is reviewed.
- [ ] Any public API exception has an ADR and migration note.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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
