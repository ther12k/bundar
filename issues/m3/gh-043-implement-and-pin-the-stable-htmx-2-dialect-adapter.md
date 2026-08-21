---
type: GitHub Issue Specification
title: GH-043 — Implement and pin the stable HTMX 2 dialect adapter
description: Bundar accurately decodes and emits the approved htmx 2 protocol profile using an exact tested upstream version.
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
  stable_id: GH-043
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-041
  - GH-042
  blocks:
  - GH-045
  - GH-046
  - GH-047
  - GH-049
  - GH-051
  - GH-052
  - GH-053
---

# GH-043 — Implement and pin the stable HTMX 2 dialect adapter

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Bundar accurately decodes and emits the approved htmx 2 protocol profile using an exact tested upstream version.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Map htmx 2 request headers into normalized metadata.
- Map normalized directives to htmx 2 response headers.
- Record v2 lifecycle event mapping, history/error behavior, inheritance assumptions, and supported extensions.
- Pin test asset version and integrity/hash evidence.

## Out of scope

- Supporting every historical htmx 1.x/2.x patch.

## Acceptance criteria

- [x] Every profile field has positive, absent, malformed, and conflict tests.
- [x] Profile states the exact htmx 2 version tested.
- [x] Unimplemented upstream features are documented rather than silently approximated.
- [x] Stable lane contains no htmx 4 beta assumptions.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/v2/**
bun run test:browser:htmx2 -- protocol
bun run htmx:profile-report -- v2
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-041 — Implement normalized HTMX request metadata](gh-041-implement-normalized-htmx-request-metadata.md)
- [GH-042 — Implement normalized HTMX response directives](gh-042-implement-normalized-htmx-response-directives.md)

## Blocks

- [GH-045 — Implement the HTMX asset registry and local serving contract](gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md)
- [GH-046 — Normalize HTMX lifecycle and application events](gh-046-normalize-htmx-lifecycle-and-application-events.md)
- [GH-047 — Add inheritance and extension compatibility helpers](gh-047-add-inheritance-and-extension-compatibility-helpers.md)
- [GH-049 — Implement cache variation and history safety policy](gh-049-implement-cache-variation-and-history-safety-policy.md)
- [GH-051 — Implement version-neutral out-of-band and partial update intents](gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md)
- [GH-052 — Implement redirect, location, and history helpers](gh-052-implement-redirect-location-and-history-helpers.md)
- [GH-053 — Close the HTMX 2 browser conformance profile](gh-053-close-the-htmx-2-browser-conformance-profile.md)


## Suggested files

- `packages/htmx/src/dialects/v2/**`
- `packages/htmx/test/v2/**`
- `docs/compatibility/htmx2.md`

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
Stable ID: GH-043
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
