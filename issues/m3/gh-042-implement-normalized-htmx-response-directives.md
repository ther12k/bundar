---
type: GitHub Issue Specification
title: GH-042 — Implement normalized HTMX response directives
description: Application responses express navigation, targeting, swapping, refresh, selection, and event intents without manually setting raw `HX-*` headers.
tags:
- github-issue
- m3
- htmx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-042
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-040
  blocks:
  - GH-043
  - GH-044
  - GH-050
  - GH-052
---

# GH-042 — Implement normalized HTMX response directives

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Application responses express navigation, targeting, swapping, refresh, selection, and event intents without manually setting raw `HX-*` headers.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define typed directives for location, redirect, refresh, push/replace URL, retarget, reselect, reswap, and event triggers.
- Define deterministic merge and conflict rules.
- Encode multi-event payloads without header injection.
- Preserve access to native Response headers and non-HTMX fallback semantics.

## Out of scope

- Page or form response composition.

## Acceptance criteria

- [ ] Conflicting redirect/location/history directives fail before a response is sent.
- [ ] Multiple triggers serialize predictably.
- [ ] Header values are validated against CRLF/header injection.
- [ ] The neutral object can be encoded by both dialect fixtures.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/response-directives/**
bun run security:headers
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-040 — Define the HTMX dialect adapter interface](gh-040-define-the-htmx-dialect-adapter-interface.md)

## Blocks

- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)
- [GH-050 — Implement the progressive action response composer](gh-050-implement-the-progressive-action-response-composer.md)
- [GH-052 — Implement redirect, location, and history helpers](gh-052-implement-redirect-location-and-history-helpers.md)


## Suggested files

- `packages/htmx/src/directives.ts`
- `packages/htmx/src/response.ts`
- `packages/htmx/test/response-directives/**`

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
Stable ID: GH-042
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
