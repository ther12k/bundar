---
type: GitHub Issue Specification
title: GH-079 — Publish generated API reference and compatibility documentation source
description: Public API, HTML/HTMX contracts, package exports, compatibility ranges, and security defaults are documented from versioned source and checked against code.
tags:
- github-issue
- m5
- docs
- docs
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-079
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:docs
  - area:docs
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-038
  - GH-056
  - GH-069
  - GH-073
  blocks:
  - GH-080
---

# GH-079 — Publish generated API reference and compatibility documentation source

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:docs`, `area:docs`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Public API, HTML/HTMX contracts, package exports, compatibility ranges, and security defaults are documented from versioned source and checked against code.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Generate API signatures from declarations or approved extractor.
- Create compatibility matrix with exact Bun, TypeScript, browser, htmx2, and htmx4 experimental versions.
- Document stable subset, raw escape hatches, lifecycle, errors, cache, forms, security, and streaming.
- Add runnable snippets verified in CI.

## Out of scope

- Choosing a hosted documentation vendor before content is stable.

## Acceptance criteria

- [ ] Every public export appears exactly once in reference navigation.
- [ ] Examples compile against packed packages.
- [ ] Current-version claims have a freshness/update owner.
- [ ] Experimental features are visually and textually distinguished.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run docs:generate
bun run docs:check
bun run docs:snippets
bun run api:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-038 — Run and record the M2 server-JSX gate](../m2/gh-038-run-and-record-the-m2-server-jsx-gate.md)
- [GH-056 — Run the M3 zero-handler-change dialect-switch gate](../m3/gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md)
- [GH-069 — Run the M4 progressive-workflow security gate](../m4/gh-069-run-the-m4-progressive-workflow-security-gate.md)
- [GH-073 — Generate route manifests and typed URL builders](gh-073-generate-route-manifests-and-typed-url-builders.md)

## Blocks

- [GH-080 — Write getting-started, architecture, security, and HTMX migration guides](gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md)


## Suggested files

- `docs/api/**`
- `docs/compatibility/**`
- `tools/docs/**`

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
Stable ID: GH-079
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
