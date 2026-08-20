---
type: GitHub Issue Specification
title: GH-062 — Define secure cookie and session integration interfaces
description: Applications can attach session stores through a narrow interface with secure cookie defaults and no built-in database coupling.
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
  stable_id: GH-062
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
  - GH-019
  blocks:
  - GH-063
  - GH-068
  - GH-077
---

# GH-062 — Define secure cookie and session integration interfaces

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:security`, `area:security`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Applications can attach session stores through a narrow interface with secure cookie defaults and no built-in database coupling.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define session ID lifecycle, load/commit/destroy interface, middleware state, and error behavior.
- Provide signed/encrypted cookie primitives only if reviewed and necessary.
- Set Secure, HttpOnly, SameSite, Path, Domain, expiry, rotation, and fixation policy.
- Add an in-memory test store explicitly unsuitable for production.

## Out of scope

- A production Redis/PostgreSQL session adapter in core.

## Acceptance criteria

- [ ] Authentication state cannot leak across requests.
- [ ] Login/privilege change rotates identifiers in fixtures.
- [ ] Logout invalidates both browser cookie and backing session.
- [ ] Production documentation requires a durable store and key management.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/security/test/session/**
bun run test:browser:session
bun run security:cookies
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-018 — Implement startup-composed sync and async middleware](../m1/gh-018-implement-startup-composed-sync-and-async-middleware.md)
- [GH-019 — Implement params, query, and cookie access adapters](../m1/gh-019-implement-params-query-and-cookie-access-adapters.md)

## Blocks

- [GH-063 — Implement flash messages and out-of-band flash regions](gh-063-implement-flash-messages-and-out-of-band-flash-regions.md)
- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)
- [GH-077 — Build the Admin CRUD reference application](../m5/gh-077-build-the-admin-crud-reference-application.md)


## Suggested files

- `packages/security/src/session/**`
- `packages/security/test/session/**`
- `docs/guides/sessions.md`

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
Stable ID: GH-062
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
