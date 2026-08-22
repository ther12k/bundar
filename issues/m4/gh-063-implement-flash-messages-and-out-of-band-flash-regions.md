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

- [x] A flash appears once after ordinary redirect.
- [x] The equivalent enhanced action updates the flash region without full navigation.
- [x] Concurrent flashes have deterministic ordering.
- [x] Message content is escaped and size-limited.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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

## Closure report

Stable ID: GH-063
Commit / PR: merged `gh-063-flash-messages` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/security/src/flash.ts` (new) + index exports, `packages/jsx/src/forms/flash-region.ts` (new) + index exports, `packages/security/test/flash.test.ts` (new, 6 tests), `packages/jsx/test/forms/flash-region.test.ts` (new, 4 tests), `evidence/gh-063/verification-transcript.md` (new).
Commands executed: flash 6/6; flash-region 4/4; security + jsx + root typecheck; lint; format; full repo 645/645; architecture (76 files); pack:inspect security + jsx; build; docs validate/links — all exit 0.
Evidence: `evidence/gh-063/verification-transcript.md`.
Contract/API changes: new exports in @bundar/security — `addFlash`, `consumeFlash`, `peekFlash`, `FlashError`, `FLASH_KEY`, `MAX_FLASH_COUNT`, `MAX_FLASH_MESSAGE_LENGTH`, `FlashRecord`/`FlashSeverity` types. New exports in @bundar/jsx — `FlashRegion`, `FlashMessage`/`FlashRegionProps` types. No existing API changed.
Security/performance impact: flash messages are stored as plain text (never HTML), size-limited to 500 chars, count-bounded to 10 with oldest-dropped (no unbounded session growth); render-time XSS-escaping tested; single-consumption semantics tested; the JSX component uses structural props preserving the zero-dependency boundary.
Remaining risks: flash content is escaped at render time by JSX — apps rendering outside JSX must escape independently; bounds are compile-time constants.
Documentation updated: this closure record, `issues/m4/index.md`, `log.md`.
Newly unblocked issues: GH-068 (now awaits only GH-066), GH-076/GH-077 (await GH-075).
