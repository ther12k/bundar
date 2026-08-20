---
type: GitHub Issue Specification
title: GH-063 — Implement flash messages and out-of-band flash regions
description: Post/Redirect/Get and enhanced responses share one flash-message model rendered safely into a stable region.
tags:
- github-issue
- m4
- forms
- feature
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-063
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:feature
  - area:forms
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-051
  - GH-062
  blocks:
  - GH-068
  - GH-076
  - GH-077
---

# GH-063 — Implement flash messages and out-of-band flash regions

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:feature`, `area:forms`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Post/Redirect/Get and enhanced responses share one flash-message model rendered safely into a stable region.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define flash record, severity, lifecycle, and single-consumption behavior.
- Provide session-backed normal navigation flow and OOB enhanced flow.
- Create accessible JSX region/helper.
- Prevent arbitrary HTML and unbounded payload storage.

## Out of scope

- Toast animation or design-system styling.

## Acceptance criteria

- [ ] A flash appears once after ordinary redirect.
- [ ] The equivalent enhanced action updates the flash region without full navigation.
- [ ] Concurrent flashes have deterministic ordering.
- [ ] Message content is escaped and size-limited.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/security/test/flash.test.ts
bun run test:browser:dual -- flash
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-051 — Implement version-neutral out-of-band and partial update intents](../m3/gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md)
- [GH-062 — Define secure cookie and session integration interfaces](gh-062-define-secure-cookie-and-session-integration-interfaces.md)

## Blocks

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)
- [GH-076 — Build the Todo reference application](../m5/gh-076-build-the-todo-reference-application.md)
- [GH-077 — Build the Admin CRUD reference application](../m5/gh-077-build-the-admin-crud-reference-application.md)


## Suggested files

- `packages/security/src/flash.ts`
- `packages/jsx/src/forms/flash-region.tsx`
- `tests/browser/flash/**`

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
Stable ID: GH-063
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
