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

- [ ] Missing, malformed, expired, replayed where prohibited, and cross-origin tokens fail closed.
- [ ] Safe methods do not rotate or consume tokens unexpectedly.
- [ ] HTMX and no-JS form flows use the same protection.
- [ ] Tokens are not logged or exposed in error messages.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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
