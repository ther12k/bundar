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

- [x] Switching dialect changes only approved bootstrap/config and lockfile/asset selection.
- [x] Route handlers and components contain no `if (htmxVersion)` logic.
- [x] Both lanes satisfy the stable-subset expectations.
- [x] Dialect-specific optional scenarios are isolated outside the shared app layer.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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

## Closure report

Stable ID: GH-055
Commit / PR: merged `gh-055-dual-dialect` into `main` (merge commit recorded in `log.md`).
Files changed: `examples/dual-dialect-fixture/{app.ts,server.ts,tsconfig.json}` (new), `tools/source-diff.ts` (new) + `htmx:source-diff` script, `tests/browser/dual/run.ts` (new) + `test:dual-app` script, `evidence/gh-055/verification-transcript.md` (new).
Commands executed: `htmx:source-diff` (zero dialect conditionals verified); `test:dual-app` (100% identical behavior in both browser lanes: counter=1 item, listItems=1, nav=/items, error=Field is required); root typecheck; lint; format; full repo 635/635; architecture (74 files); build; docs validate/links — all exit 0.
Evidence: `evidence/gh-055/verification-transcript.md`; `output/playwright/dual/dual-summary.json`.
Contract/API changes: none (example fixture and test tooling only).
Security/performance impact: application code verified free of dialect conditionals and raw protocol strings via static guard; dialect selection isolated to approved bootstrap; real browser parity proven across both dialect lanes.
Remaining risks: raw() trust boundary for OOB composition documented; htmx error-swap dialect difference covered by main browser lanes.
Documentation updated: this closure record, `issues/m3/index.md`, `log.md`.
Newly unblocked issues: GH-056.
