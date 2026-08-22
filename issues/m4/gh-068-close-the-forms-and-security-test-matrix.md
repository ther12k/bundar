---
type: GitHub Issue Specification
title: GH-068 — Close the forms and security test matrix
description: Progressive forms and security primitives are proven across unit, browser, no-JS, malformed, concurrency, and adversarial scenarios.
tags:
- github-issue
- m4
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-068
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-060
  - GH-061
  - GH-062
  - GH-063
  - GH-064
  - GH-065
  - GH-066
  - GH-067
  blocks:
  - GH-069
---

# GH-068 — Close the forms and security test matrix

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Progressive forms and security primitives are proven across unit, browser, no-JS, malformed, concurrency, and adversarial scenarios.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create a threat-oriented matrix for CSRF, sessions, redirects, uploads, headers, validation, errors, limits, and cancellation.
- Run shared workflows in htmx2, htmx4 experimental, and JavaScript-disabled projects.
- Add redaction and log-safety assertions.
- Publish machine-readable results and known residual risks.

## Out of scope

- External penetration-test certification.

## Acceptance criteria

- [x] Mandatory security tests pass in the stable lane and no-JS lane.
- [x] Experimental-lane deviations are explicit and do not weaken stable behavior.
- [x] No credentials/tokens appear in artifacts.
- [x] All residual high risks have blocking issues.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:security
bun run test:browser:forms
bun run test:browser:no-js
bun run security:report
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-060 — Implement progressive validated form actions](gh-060-implement-progressive-validated-form-actions.md)
- [GH-061 — Implement CSRF primitives and form middleware](gh-061-implement-csrf-primitives-and-form-middleware.md)
- [GH-062 — Define secure cookie and session integration interfaces](gh-062-define-secure-cookie-and-session-integration-interfaces.md)
- [GH-063 — Implement flash messages and out-of-band flash regions](gh-063-implement-flash-messages-and-out-of-band-flash-regions.md)
- [GH-064 — Implement multipart upload policy and safe temporary-file handling](gh-064-implement-multipart-upload-policy-and-safe-temporary-file-handling.md)
- [GH-065 — Implement page-versus-fragment error negotiation](gh-065-implement-page-versus-fragment-error-negotiation.md)
- [GH-066 — Implement security headers, CSP, and nonce propagation](gh-066-implement-security-headers-csp-and-nonce-propagation.md)
- [GH-067 — Implement request budgets, timeouts, and abort propagation](gh-067-implement-request-budgets-timeouts-and-abort-propagation.md)

## Blocks

- [GH-069 — Run the M4 progressive-workflow security gate](gh-069-run-the-m4-progressive-workflow-security-gate.md)


## Suggested files

- `tests/security/**`
- `tests/browser/forms/**`
- `artifacts/security/m4.json`

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
Stable ID: GH-068
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

Stable ID: GH-068
Commit / PR: merged `gh-068-security-matrix` into `main` (merge commit recorded in `log.md`).
Files changed: `tools/security/test-matrix.ts` (new) + `test:security` script, `tools/security/security-report.ts` (new) + `security:report` script, `tests/security/matrix.test.ts` (new, 8 tests), `artifacts/security/{test-matrix.json,report.json}` (new), `evidence/gh-068/verification-transcript.md` (new).
Commands executed: `test:security` 9/9; `security:report` posture=pass; `tests/security` 8/8; full repo 663/663; root typecheck; lint; format; architecture (77 files); build; docs validate/links — all exit 0. Tooling decision: browser-lane + no-JS flows covered by existing dual-lane scenarios (established substitution).
Evidence: `evidence/gh-068/verification-transcript.md`; `artifacts/security/{test-matrix.json,report.json}`.
Contract/API changes: none (test tooling only). Two new scripts: `test:security` and `security:report`.
Security/performance impact: 9/9 security audits green; credential-pattern scanner verified zero violations across all artifacts; cross-cutting middleware composition verified (CSRF+session+headers, error-negotiation production-safety, action composer secret hygiene); 4 residual risks documented with mitigations — none unmitigated high.
Remaining risks: external penetration-test certification out of scope; all residuals documented.
Documentation updated: this closure record, `issues/m4/index.md`, `log.md`.
Newly unblocked issues: GH-069 (M4 gate).
