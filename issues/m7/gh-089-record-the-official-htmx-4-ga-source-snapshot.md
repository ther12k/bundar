---
type: GitHub Issue Specification
title: GH-089 — Record the official HTMX 4 GA source snapshot
description: The repository captures authoritative HTMX 4 GA artifacts and documentation before changing the experimental adapter or compatibility claims.
tags:
- github-issue
- m7
- htmx
- docs
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-089
  milestone: M7 — HTMX 4 GA Adoption
  labels:
  - type:docs
  - area:htmx
  - priority:p0
  - size:m
  - status:blocked
  - status:experimental
  priority: p0
  size: m
  depends_on:
  - GH-056
  blocks:
  - GH-090
  upstream_gate: Official HTMX 4 general-availability release and documentation must exist.
---

# GH-089 — Record the official HTMX 4 GA source snapshot

**Milestone:** M7 — HTMX 4 GA Adoption  
**Labels:** `type:docs`, `area:htmx`, `priority:p0`, `size:m`, `status:blocked`, `status:experimental`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

The repository captures authoritative HTMX 4 GA artifacts and documentation before changing the experimental adapter or compatibility claims.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Verify GA release tag, package/version, release date, documentation, migration guide, headers, events, inheritance, history, error handling, partials, streaming, extension APIs, and compatibility extension.
- Download or pin exact test asset and record checksum.
- Update source register freshness and create a GA change snapshot.
- Do not infer GA behavior from beta notes.

## Out of scope

- Changing Bundar behavior.

## Acceptance criteria

- [ ] The upstream release is genuinely GA, not beta/RC/nightly.
- [ ] Every source URL, version, date, and asset hash is recorded.
- [ ] No adapter code changes are mixed into the evidence issue.
- [ ] If GA is not released, issue remains upstream-blocked and no success is claimed.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run upstream:htmx4-snapshot
bun run docs:validate
bun run sources:freshness
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-056 — Run the M3 zero-handler-change dialect-switch gate](../m3/gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md)

## Blocks

- [GH-090 — Diff the HTMX 4 beta adapter against the GA contract](gh-090-diff-the-htmx-4-beta-adapter-against-the-ga-contract.md)


## Upstream gate

**Blocked until:** Official HTMX 4 general-availability release and documentation must exist.

Do not close this issue from a beta, release candidate, nightly, documentation preview, or projected release date.

## Suggested files

- `docs/upstream/htmx4-ga/**`
- `docs/okf/references/htmx4-ga.md`
- `artifacts/upstream/htmx4-ga.json`

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
Stable ID: GH-089
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
