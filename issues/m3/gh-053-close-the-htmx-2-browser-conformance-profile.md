---
type: GitHub Issue Specification
title: GH-053 — Close the HTMX 2 browser conformance profile
description: Stable-lane browser evidence proves the approved request, response, rendering, action, navigation, error, and history behaviors under the pinned htmx 2 version.
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
  stable_id: GH-053
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-008
  - GH-043
  - GH-045
  - GH-048
  - GH-050
  blocks:
  - GH-055
---

# GH-053 — Close the HTMX 2 browser conformance profile

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Stable-lane browser evidence proves the approved request, response, rendering, action, navigation, error, and history behaviors under the pinned htmx 2 version.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement end-to-end scenarios for headers, boosts, targets, swaps, actions, redirects, OOB, history, malformed responses, and no-JS fallback.
- Capture HAR/trace, DOM, console, and server logs.
- Publish a machine-readable conformance report.
- Mark unsupported upstream features explicitly.

## Out of scope

- HTMX 4 stability claims.

## Acceptance criteria

- [ ] Every mandatory htmx 2 profile capability has a passing scenario.
- [ ] No test uses CDN-latest assets.
- [ ] No-JS fallback scenarios pass independently.
- [ ] The exact browser and htmx versions are recorded.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:browser:htmx2
bun run conformance:report -- htmx2
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-008 — Create browser conformance harness for HTMX 2 and HTMX 4 lanes](../m0/gh-008-create-browser-conformance-harness-for-htmx-2-and-htmx-4-lanes.md)
- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-045 — Implement the HTMX asset registry and local serving contract](gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md)
- [GH-048 — Implement full-page and fragment negotiation](gh-048-implement-full-page-and-fragment-negotiation.md)
- [GH-050 — Implement the progressive action response composer](gh-050-implement-the-progressive-action-response-composer.md)

## Blocks

- [GH-055 — Build the unchanged-source dual-dialect reference fixture](gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md)


## Suggested files

- `tests/browser/htmx2/**`
- `artifacts/conformance/htmx2.json`
- `docs/compatibility/htmx2.md`

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
Stable ID: GH-053
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
