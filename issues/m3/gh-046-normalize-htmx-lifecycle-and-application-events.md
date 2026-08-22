---
type: GitHub Issue Specification
title: GH-046 — Normalize HTMX lifecycle and application events
description: Framework-owned browser hooks and examples use stable Bundar event concepts rather than raw htmx 2 or htmx 4 lifecycle names.
tags:
- github-issue
- m3
- htmx
- feature
- p1
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-046
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p1
  - size:l
  priority: p1
  size: l
  depends_on:
  - GH-040
  - GH-043
  - GH-044
  blocks:
  - GH-078
---

# GH-046 — Normalize HTMX lifecycle and application events

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p1`, `size:l`  
**Priority:** `P1`  
**Size:** `L`

## Outcome

Framework-owned browser hooks and examples use stable Bundar event concepts rather than raw htmx 2 or htmx 4 lifecycle names.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define the minimal set of normalized events Bundar itself needs.
- Map v2 colon-style lifecycle events and v4 phase/system events where equivalence exists.
- Represent non-equivalent events as capability differences instead of false aliases.
- Separate server-triggered application events from client lifecycle events.

## Out of scope

- Recreating the entire upstream event API.

## Acceptance criteria

- [x] Core reference apps contain no raw version-specific lifecycle event names.
- [x] Event mapping table identifies exact, approximate, and unsupported mappings.
- [x] Application event payloads are JSON-safe and injection-tested.
- [x] Users can opt into raw dialect events through an explicit escape hatch reported by the audit tool.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/events/**
bun run test:browser:htmx2 -- events
bun run test:browser:htmx4 -- events
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-040 — Define the HTMX dialect adapter interface](gh-040-define-the-htmx-dialect-adapter-interface.md)
- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)

## Blocks

- [GH-078 — Implement the HTMX 2-to-4 audit and migration linter](../m5/gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md)


## Suggested files

- `packages/htmx/src/events.ts`
- `packages/htmx/src/dialects/*/events.ts`
- `packages/htmx/test/events/**`

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
Stable ID: GH-046
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

Stable ID: GH-046
Commit / PR: merged `gh-046-events` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/htmx/src/events.ts` (new), `packages/htmx/test/events/events.test.ts` (new, 8 tests), `packages/htmx/README.md`, `evidence/gh-046/verification-transcript.md` (new).
Commands executed: events 8/8; both browser lanes; htmx + root typecheck; lint; format; full repo 612/612; architecture (71 files); pack:inspect @bundar/htmx; build; docs validate/links — all exit 0.
Evidence: `evidence/gh-046/verification-transcript.md`.
Contract/API changes: new exports in @bundar/htmx — `resolveDialectEvent`, `getEventMappingTable`, `createApplicationEvent`, `rawDialectEvent`, `EventDefinitionError`, `BundarLifecycleEvent`, `EventMapping`, `EventMappingKind`, `HtmxApplicationEvent`, `RawDialectEvent` types. No existing API changed.
Security/performance impact: application event payloads are validated for JSON-serializability and injection prevention; lifecycle events are mapped across dialects with exact/approximate/unsupported fidelity indicators; raw dialect events are audited.
Remaining risks: none.
Documentation updated: htmx README, this closure record, `issues/m3/index.md`, `log.md`.
Newly unblocked issues: GH-078 (when GH-047 is completed).
