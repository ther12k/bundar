---
type: GitHub Issue Specification
title: GH-041 — Implement normalized HTMX request metadata
description: Route code reads a stable metadata object instead of raw, version-specific request headers.
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
  stable_id: GH-041
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
  - GH-048
---

# GH-041 — Implement normalized HTMX request metadata

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Route code reads a stable metadata object instead of raw, version-specific request headers.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define normalized request kind, source element, target, current URL, boost, prompt, history restore, and representation fields.
- Distinguish absent, malformed, and unsupported metadata.
- Expose original raw headers only behind an explicit diagnostic escape hatch.
- Define trusted/untrusted handling for browser-provided URLs and selectors.

## Out of scope

- Business authorization based on element identity.

## Acceptance criteria

- [ ] No consumer needs to know whether v2 sent `HX-Trigger` or v4 sent `HX-Source`.
- [ ] Unknown request types degrade to documented safe behavior.
- [ ] Raw client values are never treated as authorization or trusted redirect destinations.
- [ ] Header parsing is case-insensitive and deterministic.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/request-normalization/**
bun run security:headers
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-040 — Define the HTMX dialect adapter interface](gh-040-define-the-htmx-dialect-adapter-interface.md)

## Blocks

- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)
- [GH-048 — Implement full-page and fragment negotiation](gh-048-implement-full-page-and-fragment-negotiation.md)


## Suggested files

- `packages/htmx/src/request.ts`
- `packages/htmx/src/normalized-request.ts`
- `packages/htmx/test/request-normalization/**`

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
Stable ID: GH-041
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
