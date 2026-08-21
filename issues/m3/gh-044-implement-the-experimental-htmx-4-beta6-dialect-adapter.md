---
type: GitHub Issue Specification
title: GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter
description: Bundar can exercise the same normalized contract against the observed htmx 4.0.0-beta6 behavior without promoting it to stable support.
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
  stable_id: GH-044
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
  - GH-054
---

# GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Bundar can exercise the same normalized contract against the observed htmx 4.0.0-beta6 behavior without promoting it to stable support.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Map v4 request headers including source/request-type/representation semantics.
- Map response directives and new default error-swap behavior.
- Record explicit inheritance, event phases, history behavior, extension changes, partials, and streaming capabilities.
- Pin beta6 asset/version and annotate every provisional assumption.

## Out of scope

- Claiming future GA compatibility from beta behavior.

## Acceptance criteria

- [x] Adapter identity includes `experimental` maturity and exact beta version.
- [x] Beta-only behavior cannot alter the stable v2 adapter.
- [x] Every known migration difference has a fixture or explicit unsupported record.
- [x] Documentation warns that GA revalidation is mandatory.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/v4/**
bun run test:browser:htmx4 -- protocol
bun run htmx:profile-report -- v4
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
- [GH-054 — Close the HTMX 4 beta browser conformance profile](gh-054-close-the-htmx-4-beta-browser-conformance-profile.md)


## Suggested files

- `packages/htmx/src/dialects/v4/**`
- `packages/htmx/test/v4/**`
- `docs/compatibility/htmx4-beta6.md`

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
Stable ID: GH-044
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
