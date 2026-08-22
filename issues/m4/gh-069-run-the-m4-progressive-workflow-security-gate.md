---
type: GitHub Issue Specification
title: GH-069 — Run the M4 progressive-workflow security gate
description: Maintainers approve a representative authenticated, validated, progressive workflow as a safe foundation for examples and alpha packaging.
tags:
- github-issue
- m4
- release
- release
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-069
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-068
  blocks:
  - GH-071
  - GH-079
  - GH-082
---

# GH-069 — Run the M4 progressive-workflow security gate

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Maintainers approve a representative authenticated, validated, progressive workflow as a safe foundation for examples and alpha packaging.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Build and execute a sample create/edit/delete workflow with session, CSRF, validation, flash, uploads where applicable, and error handling.
- Run both HTMX lanes and no-JS fallback.
- Review threat model, security defaults, and residual limitations.
- Record commit, versions, evidence, and release-blocking findings.

## Out of scope

- General authentication product or user management UI.

## Acceptance criteria

- [x] Workflow source is shared across browser modes.
- [x] Authorization is server-side and independent of HTMX metadata.
- [x] All M4 mandatory gates pass.
- [x] No security limitation is hidden behind example-only assumptions.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run ci:m4
bun run test:reference-workflow
bun run security:report
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)

## Blocks

- [GH-071 — Implement create-bundar scaffolding](../m5/gh-071-implement-create-bundar-scaffolding.md)
- [GH-079 — Publish generated API reference and compatibility documentation source](../m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md)
- [GH-082 — Run the complete dual-dialect end-to-end matrix](../m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)


## Suggested files

- `examples/workflow-gate/**`
- `docs/okf/delivery/gates/m4.md`
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
Stable ID: GH-069
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

Stable ID: GH-069
Commit / PR: merged `gh-069-m4-gate` into `main` (merge commit recorded in `log.md`).
Files changed: `examples/workflow-gate/{workflow.ts,package.json,tsconfig.json}` (new), `tests/workflow/reference-workflow.test.ts` (new, 15 tests), `scripts/m4-gate.ts` (new) + `ci:m4`/`test:reference-workflow` scripts, `packages/security/src/csrf.ts` (422-no-rotation fix) + one new unit test, `delivery/gates/m4.md` (new), `evidence/gh-069/verification-transcript.md` (new).
Commands executed: `ci:m4` 40/40 exit 0 (test:security 9/9 audits, security:report posture=pass, test:reference-workflow 15/15, both browser lanes, full suite 679/679, build); `bun test packages/security tests/security` 66/66. All exit 0.
Evidence: `evidence/gh-069/verification-transcript.md`; `delivery/gates/m4.md`; `artifacts/security/{test-matrix.json,report.json}`.
Contract/API changes: behavioral fix in `csrfMiddleware` — token rotation now applies only to state-changing (non-4xx) responses; a 422 re-render keeps the verified token valid so form retries verify. Two new scripts: `ci:m4`, `test:reference-workflow`. The frozen workflow composition contract is recorded in `delivery/gates/m4.md`.
Security/performance impact: the gate found and fixed a real CSRF/synchronizer defect (rotation on non-mutating responses breaking re-rendered-form retries); verified session-bound tokens, fail-closed 403 matrix, generic 401s with no protected-content leakage in both lanes, and dialect-adapter composition. No performance-relevant changes.
Remaining risks: multi-action enhanced sessions re-render the form region between state changes (documented synchronizer contract); example uses in-memory store + `secure: false` for local/test only; htmx 4 remains experimental — no GA claim.
Documentation updated: this closure record, `delivery/gates/m4.md`, `issues/m4/index.md`, `log.md`.
Newly unblocked issues: GH-071 (create-bundar), GH-079 (API reference), and the M5 chain.
