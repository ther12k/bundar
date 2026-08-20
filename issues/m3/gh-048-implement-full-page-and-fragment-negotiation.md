---
type: GitHub Issue Specification
title: GH-048 — Implement full-page and fragment negotiation
description: One route can return a complete document for ordinary navigation and an HTML fragment for enhanced requests through normalized metadata.
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
  stable_id: GH-048
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-033
  - GH-041
  blocks:
  - GH-049
  - GH-050
  - GH-053
  - GH-054
  - GH-065
---

# GH-048 — Implement full-page and fragment negotiation

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

One route can return a complete document for ordinary navigation and an HTML fragment for enhanced requests through normalized metadata.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define `view()`/approved page-fragment response API.
- Negotiate normal, boosted, fragment, and history-restore requests through the selected dialect.
- Add layout invocation and fragment-only rendering paths.
- Make cache variation and representation identity available to later policy.

## Out of scope

- Form mutation actions.

## Acceptance criteria

- [ ] The same handler returns a complete document to a normal browser and fragment to HTMX.
- [ ] History restore does not accidentally install a fragment as a document.
- [ ] No handler reads raw HTMX headers.
- [ ] No-JS navigation remains valid HTML and usable.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/render-negotiation/**
bun run test:browser:dual -- page-fragment
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-033 — Implement renderToString and JSX Response integration](../m2/gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-041 — Implement normalized HTMX request metadata](gh-041-implement-normalized-htmx-request-metadata.md)

## Blocks

- [GH-049 — Implement cache variation and history safety policy](gh-049-implement-cache-variation-and-history-safety-policy.md)
- [GH-050 — Implement the progressive action response composer](gh-050-implement-the-progressive-action-response-composer.md)
- [GH-053 — Close the HTMX 2 browser conformance profile](gh-053-close-the-htmx-2-browser-conformance-profile.md)
- [GH-054 — Close the HTMX 4 beta browser conformance profile](gh-054-close-the-htmx-4-beta-browser-conformance-profile.md)
- [GH-065 — Implement page-versus-fragment error negotiation](../m4/gh-065-implement-page-versus-fragment-error-negotiation.md)


## Suggested files

- `packages/htmx/src/view.ts`
- `packages/htmx/test/render-negotiation/**`
- `examples/fixtures/page-fragment/**`

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
Stable ID: GH-048
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
