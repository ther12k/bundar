---
type: GitHub Issue Specification
title: GH-082 — Run the complete dual-dialect end-to-end matrix
description: Packed Bundar packages and reference applications pass the full stable HTMX 2, experimental HTMX 4, and no-JavaScript behavior matrix.
tags:
- github-issue
- m6
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-082
  milestone: M6 — Alpha Readiness
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-056
  - GH-069
  - GH-081
  blocks:
  - GH-083
  - GH-087
  - GH-092
---

# GH-082 — Run the complete dual-dialect end-to-end matrix

**Milestone:** M6 — Alpha Readiness  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Packed Bundar packages and reference applications pass the full stable HTMX 2, experimental HTMX 4, and no-JavaScript behavior matrix.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run clean-install E2E suites for minimal, Todo, Admin, and security workflow examples.
- Exercise supported browsers, normal/boosted/history requests, forms, errors, OOB/partials, sessions, CSRF, uploads, aborts, and accessibility smoke checks.
- Archive traces, version manifests, server logs, and machine-readable results.
- Classify every experimental-lane deviation.

## Out of scope

- HTMX 4 GA claims.

## Acceptance criteria

- [x] Stable HTMX 2 and no-JS mandatory scenarios pass.
- [x] Shared app source guard passes.
- [x] HTMX 4 beta deviations are explicit and not counted as stable pass.
- [x] Tests use packed artifacts and exact pinned upstream assets.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:e2e:release
bun run htmx:source-diff
bun run conformance:release-report
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-056 — Run the M3 zero-handler-change dialect-switch gate](../m3/gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md)
- [GH-069 — Run the M4 progressive-workflow security gate](../m4/gh-069-run-the-m4-progressive-workflow-security-gate.md)
- [GH-081 — Run the M5 developer-experience usability gate](../m5/gh-081-run-the-m5-developer-experience-usability-gate.md)

## Blocks

- [GH-083 — Run final alpha performance and regression budgets](gh-083-run-final-alpha-performance-and-regression-budgets.md)
- [GH-087 — Write alpha release notes, compatibility statement, and known limitations](gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md)
- [GH-092 — Run dual-version regression CI against HTMX 2 and HTMX 4 GA](../m7/gh-092-run-dual-version-regression-ci-against-htmx-2-and-htmx-4-ga.md)


## Suggested files

- `tests/e2e/**`
- `artifacts/conformance/release-matrix.json`
- `docs/compatibility/matrix.md`

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
Stable ID: GH-082
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

Stable ID: GH-082
Commit / PR: merged `gh-082-dual-matrix` into `main` (merge commit recorded in `log.md`).
Files changed: `tools/e2e-release.ts` (new) + `test:e2e:release`/`conformance:release-report` scripts, `tests/e2e/accessibility-smoke.test.ts` (new, 3 tests), `artifacts/conformance/release-matrix.json` (new, machine-readable), `evidence/gh-082/verification-transcript.md`.
Commands executed: `test:e2e:release` exit 0 — 19/19 suites (template×2, todo×3, admin×3, workflow, scaffold×2, browser lanes×3, security×3, source guard, a11y smoke); 6 experimental deviations classified from the pinned profile; htmx:source-diff green; full suite 827/827; typecheck; lint; format; architecture; api:check; build; docs — all exit 0.
Evidence: `evidence/gh-082/verification-transcript.md`; `artifacts/conformance/release-matrix.json`.
Contract/API changes: none to packages (orchestration + tests only).
Security/performance impact: none new; the matrix re-verifies the full security battery inside the release gate.
Remaining risks: Chrome-for-Testing only until GA evidence (M7); beta DOM error-swap divergence remains classified (M7 revalidation).
Documentation updated: this closure record, `issues/m6/index.md`, `log.md`.
Newly unblocked issues: GH-083, GH-087, and (M7) GH-092.
