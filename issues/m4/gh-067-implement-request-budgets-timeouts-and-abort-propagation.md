---
type: GitHub Issue Specification
title: GH-067 — Implement request budgets, timeouts, and abort propagation
description: Handlers, parsers, middleware, async JSX, and streams observe request cancellation and enforce configurable execution/resource budgets.
tags:
- github-issue
- m4
- core
- security
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-067
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:security
  - area:core
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-018
  - GH-057
  blocks:
  - GH-068
---

# GH-067 — Implement request budgets, timeouts, and abort propagation

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:security`, `area:core`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Handlers, parsers, middleware, async JSX, and streams observe request cancellation and enforce configurable execution/resource budgets.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define request deadline/timeout middleware and budget context.
- Propagate AbortSignal into parsing, renderer, and user hooks where APIs allow.
- Classify timeout, abort, server-shutdown, and client-disconnect outcomes.
- Add slowloris/body, slow handler, slow renderer, and disconnect fixtures.

## Out of scope

- Hard sandboxing of trusted application code.

## Acceptance criteria

- [x] Timed-out work does not continue indefinitely in controlled fixtures.
- [x] Abort does not become a generic 500 when the response is no longer writable.
- [x] Limits can be overridden per route only within server maximums.
- [x] Resource cleanup is verified.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/budgets/**
bun run test:browser:abort
bun run test:leaks -- request-budgets
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-018 — Implement startup-composed sync and async middleware](../m1/gh-018-implement-startup-composed-sync-and-async-middleware.md)
- [GH-057 — Implement bounded form and request-body parsing](gh-057-implement-bounded-form-and-request-body-parsing.md)

## Blocks

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)


## Suggested files

- `packages/core/src/budget.ts`
- `packages/core/test/budgets/**`
- `tests/browser/abort/**`

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
Stable ID: GH-067
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

Stable ID: GH-067
Commit / PR: merged `gh-067-csp-nonce` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/core/src/budget.ts` (new), `packages/core/src/errors.ts` (+`request_timeout` 408, +`service_unavailable` 503, `isAbortLike` recognizes the `AbortedRenderError` name contract), `packages/core/src/request/body.ts` (slowloris guard defect fixed: cancel reasons never reached `read()`, so dribbled bodies were silently accepted as complete partial reads), `packages/core/src/routing/compiler.ts` + `app.ts` (TerminalOptions `error` hook now forwarded to Bun.serve), `packages/core/test/budgets/**` (new, 27 tests incl. real-server slowloris/disconnect fixtures), `packages/core/test/import.test.ts` (71-export snapshot), `artifacts/api/core.md` (regenerated deliberately), `evidence/gh-067/verification-transcript.md` (new).
Commands executed: budgets suite 27/27; body suite 13/13; full repo 397/397; package + root typecheck; lint; format; architecture:check (48 files); api:report + api:check (71 exports); pack:inspect @bundar/core; build; docs validate/links; bench:parity — all exit 0. Tooling decisions for the planned `test:browser:abort` and `test:leaks` commands are documented in the transcript (stronger raw-socket + direct cleanup-verification fixtures).
Evidence: `evidence/gh-067/verification-transcript.md`; `artifacts/api/core.md`.
Contract/API changes: new public API — `requestBudget`, `createRequestBudget`, `resolveBudget`, `classifyRequestOutcome`, `bodyLimitToHttpError`, `getRequestBudget`, `REQUEST_BUDGET`, `DEFAULT_BUDGET_MAXIMUMS`, `RequestTimeoutError`, `BudgetPolicyError` and associated types; two new HttpError codes (408/503); `TerminalOptions.error` hook now forwarded. Surface snapshot regenerated 61→71 exports.
Security/performance impact: dribbled bodies now hard-fail 408 instead of being accepted partially; per-route limits are capped by frozen server maximums at composition time; abort outcomes are classified by source (client→499, deadline→503, shutdown) and never leak as opaque 500s; budget installation trades the GH-018 sync fast path for deadline enforcement on budgeted routes only.
Remaining risks: non-cooperative handlers cannot be force-stopped (platform limit — the race answers at the deadline and the signal gives cooperative work a stop path); `AbortedRenderError` matched by documented name contract; setTimeout/Date.now scheduling jitter of a few ms.
Documentation updated: this closure record, `issues/m4/index.md`, `log.md`, regenerated API snapshot, evidence transcript.
Newly unblocked issues: GH-068.
