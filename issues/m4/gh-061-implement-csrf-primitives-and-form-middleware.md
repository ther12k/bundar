---
type: GitHub Issue Specification
title: GH-061 — Implement CSRF primitives and form middleware
description: State-changing cookie-authenticated requests can be protected with explicit, testable CSRF tokens and origin policy.
tags:
- github-issue
- m4
- security
- security
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-061
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:security
  - area:security
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-018
  - GH-057
  blocks:
  - GH-064
  - GH-068
---

# GH-061 — Implement CSRF primitives and form middleware

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:security`, `area:security`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

State-changing cookie-authenticated requests can be protected with explicit, testable CSRF tokens and origin policy.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define threat model and supported token strategy using secure Bun/web primitives.
- Implement token generation, binding, constant-time verification where applicable, rotation, and expiry.
- Provide hidden-input JSX helper and middleware for approved unsafe methods.
- Validate Origin/Sec-Fetch metadata according to documented fallback policy.

## Out of scope

- Solving XSS; CSRF tokens do not replace output escaping/CSP.

## Acceptance criteria

- [x] Missing, malformed, expired, replayed where prohibited, and cross-origin tokens fail closed.
- [x] Safe methods do not rotate or consume tokens unexpectedly.
- [x] HTMX and no-JS form flows use the same protection.
- [x] Tokens are not logged or exposed in error messages.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/security/test/csrf/**
bun run test:browser:dual -- csrf
bun run security:csrf
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-018 — Implement startup-composed sync and async middleware](../m1/gh-018-implement-startup-composed-sync-and-async-middleware.md)
- [GH-057 — Implement bounded form and request-body parsing](gh-057-implement-bounded-form-and-request-body-parsing.md)

## Blocks

- [GH-064 — Implement multipart upload policy and safe temporary-file handling](gh-064-implement-multipart-upload-policy-and-safe-temporary-file-handling.md)
- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)


## Suggested files

- `packages/security/src/csrf.ts`
- `packages/jsx/src/forms/csrf-input.tsx`
- `packages/security/test/csrf/**`

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
Stable ID: GH-061
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

Stable ID: GH-061
Commit / PR: merged `gh-061-csrf` into `main` (merge commit recorded in `log.md`).
Files changed: `decisions/0017-security-package.md` (new ADR superseding ADR-0016's map by adding @bundar/security), `tools/architecture-check/boundaries.json` (8th rule), `decisions/index.md`, `tests/skeleton.test.ts`, `packages/security/**` (new package: csrf.ts, index, manifest, README, 22 tests), `packages/jsx/src/forms/csrf-input.ts` (new) + index export + 3 tests, `tools/security/csrf-audit.ts` (new) + `security:csrf` script, browser fixture routes + both-lane scenarios + error-boundary wiring, root `tsconfig.json` path, `evidence/gh-061/verification-transcript.md` (new).
Commands executed: security 22/22; jsx forms 9/9; `security:csrf` audit; both browser lanes with CSRF scenarios hard-asserted; package×2+root typecheck; lint; format; full suite 459/459; architecture (56 files / 8 rules); pack:inspect @bundar/security; build; docs validate (211 documents — ADR included) + links — all exit 0.
Evidence: `evidence/gh-061/verification-transcript.md`; browser artifacts `output/playwright/{htmx2,htmx4}/csrf-*`.
Contract/API changes: new package @bundar/security (ADR-0017) — `csrfMiddleware`, `issueCsrfToken`, `verifyCsrfToken`, `verifyOrigin`, `createCsrfSecret`, `constantTimeEqual`, `createInMemoryTokenStore`, `CsrfError`, `CSRF_FORM_FIELD`/`CSRF_HEADER` + types; `CsrfInput` in @bundar/jsx. No existing API changed.
Security/performance impact: synchronizer tokens HMAC-bound to the session cookie with constant-time MAC comparison, expiry, rotation on verified state changes, optional pluggable single-use replay store; Origin/Sec-Fetch-Site chain fails closed (absent evidence rejected); token submission read from a request clone preserving single-consumption; generic 403 envelope with reasons server-side only; tokens verified absent from serialized errors (audited).
Remaining risks: default in-memory store is single-process (documented; pluggable); session-id rotation invalidates outstanding tokens (fail closed); non-browser clients without Origin are rejected by policy; token read buffers a bounded clone of form bodies.
Documentation updated: ADR-0017 + index, `packages/security/README.md`, this closure record, `issues/m4/index.md`, `log.md`.
Newly unblocked issues: GH-064, GH-068.
