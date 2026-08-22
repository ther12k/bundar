---
type: GitHub Issue Specification
title: GH-050 — Implement the progressive action response composer
description: A mutation can return an HTMX fragment/directives or a normal Post/Redirect/Get fallback from one explicit action result.
tags:
- github-issue
- m3
- htmx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-050
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-033
  - GH-042
  - GH-048
  blocks:
  - GH-051
  - GH-052
  - GH-053
  - GH-054
  - GH-060
---

# GH-050 — Implement the progressive action response composer

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

A mutation can return an HTMX fragment/directives or a normal Post/Redirect/Get fallback from one explicit action result.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define `action()` result with fragment, ordinary redirect, status, directives, and events.
- Implement normal request versus HTMX request composition.
- Define null/empty fragment semantics and allowed status ranges.
- Keep transaction/business logic outside the response composer.

## Out of scope

- Form parsing and validation.

## Acceptance criteria

- [x] Ordinary form submission receives an approved redirect status and location.
- [x] Enhanced submission receives HTML/directives without requiring a JSON API.
- [x] A missing fallback redirect fails validation unless route explicitly opts out.
- [x] Conflicting action fields produce a compile/runtime diagnostic before response commit.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/actions/**
bun run test:browser:dual -- action-fallback
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-033 — Implement renderToString and JSX Response integration](../m2/gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-042 — Implement normalized HTMX response directives](gh-042-implement-normalized-htmx-response-directives.md)
- [GH-048 — Implement full-page and fragment negotiation](gh-048-implement-full-page-and-fragment-negotiation.md)

## Blocks

- [GH-051 — Implement version-neutral out-of-band and partial update intents](gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md)
- [GH-052 — Implement redirect, location, and history helpers](gh-052-implement-redirect-location-and-history-helpers.md)
- [GH-053 — Close the HTMX 2 browser conformance profile](gh-053-close-the-htmx-2-browser-conformance-profile.md)
- [GH-054 — Close the HTMX 4 beta browser conformance profile](gh-054-close-the-htmx-4-beta-browser-conformance-profile.md)
- [GH-060 — Implement progressive validated form actions](../m4/gh-060-implement-progressive-validated-form-actions.md)


## Suggested files

- `packages/htmx/src/action.ts`
- `packages/htmx/test/actions/**`

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
Stable ID: GH-050
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

Stable ID: GH-050
Commit / PR: merged `gh-050-action-composer` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/htmx/src/action.ts` (new) + index exports, `packages/htmx/test/actions/action.test.ts` (new, 15 tests), browser fixture `/action-save` route + `action-fallback` scenario in both lanes, `packages/htmx/README.md`, `evidence/gh-050/verification-transcript.md` (new).
Commands executed: actions 15/15; both browser lanes with the action-fallback scenario (opaque-redirect proof + followed PRG target + enhanced fragment/trigger assertions); htmx + root typecheck; lint; format; full repo 546/546; architecture (64 files); pack:inspect @bundar/htmx; build; docs validate/links — all exit 0. Tooling decision: dual-lane browser substitution for the planned `test:browser:dual -- action-fallback` (exact 303/Location asserted at unit level since browsers hide manual redirects).
Evidence: `evidence/gh-050/verification-transcript.md`; `output/playwright/*/action-fallback.json`.
Contract/API changes: new exports in @bundar/htmx — `action`, `actionResponse`, `composeAction`, `ActionDefinitionError`, `ACTION_VARY_HEADERS` + option/result types (approved redirect + body status sets). No existing API changed.
Security/performance impact: validation fires at handler time before any response commit; string fragments escape as text (markup requires a tree or the explicit raw() boundary); enhanced responses carry the negotiation Vary and fail-safe cache policy (private option); the composer owns only response composition.
Remaining risks: raw-header parsing must follow GH-042's JSON event encoding; experimental-lane DOM swaps remain observations per policy (server-side composition hard-asserted in both lanes).
Documentation updated: htmx README, this closure record, `issues/m3/index.md`, `log.md`.
Newly unblocked issues: GH-051, GH-052, GH-053, GH-054, GH-060.
