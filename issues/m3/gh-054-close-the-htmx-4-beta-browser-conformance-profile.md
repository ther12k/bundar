---
type: GitHub Issue Specification
title: GH-054 — Close the HTMX 4 beta browser conformance profile
description: Experimental-lane evidence records what actually works under htmx 4.0.0-beta6 and where the beta differs from the neutral contract.
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
  stable_id: GH-054
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
  - GH-044
  - GH-045
  - GH-048
  - GH-050
  blocks:
  - GH-055
---

# GH-054 — Close the HTMX 4 beta browser conformance profile

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Experimental-lane evidence records what actually works under htmx 4.0.0-beta6 and where the beta differs from the neutral contract.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run the equivalent scenario corpus under the pinned beta.
- Add v4-specific scenarios for request type/source, explicit inheritance, event phases, error swaps, partials, and streaming where supported.
- Classify failures as Bundar defect, adapter gap, unsupported capability, or upstream beta issue.
- Publish machine-readable experimental report.

## Out of scope

- Future GA certification.

## Acceptance criteria

- [ ] The report clearly says beta/experimental.
- [ ] Shared scenarios use the same server application source as v2.
- [ ] Known beta differences are not hidden with blanket skips.
- [ ] Every skip has reason, owner, and reassessment condition.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:browser:htmx4
bun run conformance:report -- htmx4-beta6
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-008 — Create browser conformance harness for HTMX 2 and HTMX 4 lanes](../m0/gh-008-create-browser-conformance-harness-for-htmx-2-and-htmx-4-lanes.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)
- [GH-045 — Implement the HTMX asset registry and local serving contract](gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md)
- [GH-048 — Implement full-page and fragment negotiation](gh-048-implement-full-page-and-fragment-negotiation.md)
- [GH-050 — Implement the progressive action response composer](gh-050-implement-the-progressive-action-response-composer.md)

## Blocks

- [GH-055 — Build the unchanged-source dual-dialect reference fixture](gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md)


## Suggested files

- `tests/browser/htmx4/**`
- `artifacts/conformance/htmx4-beta6.json`
- `docs/compatibility/htmx4-beta6.md`

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
Stable ID: GH-054
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
