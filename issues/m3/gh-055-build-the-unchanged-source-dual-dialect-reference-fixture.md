---
type: GitHub Issue Specification
title: GH-055 — Build the unchanged-source dual-dialect reference fixture
description: One application source tree exercises full-page navigation, fragments, actions, multi-region updates, errors, and history under both adapters.
tags:
- github-issue
- m3
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-055
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-051
  - GH-052
  - GH-053
  - GH-054
  blocks:
  - GH-056
---

# GH-055 — Build the unchanged-source dual-dialect reference fixture

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

One application source tree exercises full-page navigation, fragments, actions, multi-region updates, errors, and history under both adapters.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create a representative app fixture with dialect selected only in bootstrap/configuration.
- Run identical domain/routes/components against both lanes.
- Add source-tree diff guard that rejects dialect conditionals in application code.
- Produce side-by-side behavior and DOM reports.

## Out of scope

- Real-world polished example UI.

## Acceptance criteria

- [ ] Switching dialect changes only approved bootstrap/config and lockfile/asset selection.
- [ ] Route handlers and components contain no `if (htmxVersion)` logic.
- [ ] Both lanes satisfy the stable-subset expectations.
- [ ] Dialect-specific optional scenarios are isolated outside the shared app layer.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:dual-app
bun run htmx:source-diff
bun run conformance:compare
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-051 — Implement version-neutral out-of-band and partial update intents](gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md)
- [GH-052 — Implement redirect, location, and history helpers](gh-052-implement-redirect-location-and-history-helpers.md)
- [GH-053 — Close the HTMX 2 browser conformance profile](gh-053-close-the-htmx-2-browser-conformance-profile.md)
- [GH-054 — Close the HTMX 4 beta browser conformance profile](gh-054-close-the-htmx-4-beta-browser-conformance-profile.md)

## Blocks

- [GH-056 — Run the M3 zero-handler-change dialect-switch gate](gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md)


## Suggested files

- `examples/dual-dialect-fixture/**`
- `tests/browser/dual/**`
- `artifacts/conformance/dual-compare.json`

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
Stable ID: GH-055
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
