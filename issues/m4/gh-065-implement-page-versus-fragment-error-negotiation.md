---
type: GitHub Issue Specification
title: GH-065 — Implement page-versus-fragment error negotiation
description: Validation, authorization, not-found, conflict, and unexpected errors render into the correct page or fragment target under both dialects and no-JS fallback.
tags:
- github-issue
- m4
- htmx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-065
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-020
  - GH-048
  - GH-059
  blocks:
  - GH-068
---

# GH-065 — Implement page-versus-fragment error negotiation

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Validation, authorization, not-found, conflict, and unexpected errors render into the correct page or fragment target under both dialects and no-JS fallback.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define error presentation result separate from exception classification.
- Select full error documents, local form errors, modal/region errors, or empty responses by explicit policy.
- Handle htmx 2 versus htmx 4 error-swap differences through adapters.
- Provide safe retarget/reswap hints without trusting client target as authorization.

## Out of scope

- Application-specific branded error designs.

## Acceptance criteria

- [x] A 422 form error updates the intended region in both lanes.
- [x] A 401/403 flow cannot expose protected fragment content.
- [x] An unexpected 500 returns a safe full-page or fragment response and logs correlation data.
- [x] Normal browser behavior remains usable.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/error-negotiation/**
bun run test:browser:dual -- errors
bun run test:browser:no-js -- errors
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-020 — Implement HttpError and the global error boundary](../m1/gh-020-implement-httperror-and-the-global-error-boundary.md)
- [GH-048 — Implement full-page and fragment negotiation](../m3/gh-048-implement-full-page-and-fragment-negotiation.md)
- [GH-059 — Define validation results and field-error rendering data](gh-059-define-validation-results-and-field-error-rendering-data.md)

## Blocks

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)


## Suggested files

- `packages/htmx/src/error-view.ts`
- `packages/htmx/test/error-negotiation/**`
- `tests/browser/errors/**`

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
Stable ID: GH-065
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

Stable ID: GH-065
Commit / PR: merged `gh-065-error-negotiation` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/htmx/src/error-view.ts` (new) + index exports, `packages/htmx/test/error-negotiation/error-view.test.ts` (new, 14 tests), browser `/error-validation` + `/error-forbidden` routes and the `error-negotiation` scenario in both lanes, `packages/htmx/README.md`, `evidence/gh-065/verification-transcript.md` (new).
Commands executed: error-negotiation 14/14; both browser lanes with the error scenario (enhanced 422 fragment + server-known retarget with hostile client target ignored; ordinary 422 full document; enhanced 403 document path with the deliberately-secret fragment never served; ordinary 403 document); htmx + root typecheck; lint; format; full repo 560/560; architecture (65 files); pack:inspect @bundar/htmx; build; docs validate/links — all exit 0. Tooling decisions: dual-lane + no-JS-in-one substitution for the planned `test:browser:dual/no-js -- errors`.
Evidence: `evidence/gh-065/verification-transcript.md`; `output/playwright/*/errors.json`.
Contract/API changes: new exports in @bundar/htmx — `errorViewResponse`, `errorSwapMode`, `validationErrorView`, `renderValidationErrorFragment`, `ErrorPresentationError` + policy/view/mode types. No existing API changed.
Security/performance impact: 401/403 take the document path unless the app explicitly opts in via renderAuthFragment (protected fragments cannot leak to enhanced requests — browser-proven); retarget hints come only from server policy (client HX-Target is never authorization); error responses are private/no-store with the negotiation Vary; messages escaped; correlation ids stay out of bodies; the v4 no-swap default is compensated with an explicit reswap so error fragments render.
Remaining risks: renderAuthFragment opt-in apps own their fragment exposure (documented); v4 swap compensation pending GA revalidation; branded designs out of scope.
Documentation updated: htmx README, this closure record, `issues/m4/index.md`, `log.md`.
Newly unblocked issues: contributes to GH-068 (awaits GH-060/063/064/066).
