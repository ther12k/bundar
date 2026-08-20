---
type: GitHub Issue Specification
title: GH-056 — Run the M3 zero-handler-change dialect-switch gate
description: Maintainers verify that HTMX versions are isolated behind adapters and accept htmx 2 as stable/default with htmx 4 beta as experimental.
tags:
- github-issue
- m3
- release
- release
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-056
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-055
  blocks:
  - GH-071
  - GH-079
  - GH-082
  - GH-089
---

# GH-056 — Run the M3 zero-handler-change dialect-switch gate

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Maintainers verify that HTMX versions are isolated behind adapters and accept htmx 2 as stable/default with htmx 4 beta as experimental.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run package, architecture, dual-browser, source-diff, compatibility, and security gates.
- Review every raw dialect escape hatch and unsupported capability.
- Record exact htmx asset versions and hashes.
- Freeze the migration contract used by later reference applications.

## Out of scope

- Changing the default to htmx 4.

## Acceptance criteria

- [ ] Shared application source passes both stable-subset lanes.
- [ ] No raw header parsing exists outside adapters.
- [ ] No core/JSX dependency on htmx exists.
- [ ] Documentation never labels beta support as GA.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run ci:m3
bun run htmx:source-diff
bun run conformance:compare
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-055 — Build the unchanged-source dual-dialect reference fixture](gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md)

## Blocks

- [GH-071 — Implement create-bundar scaffolding](../m5/gh-071-implement-create-bundar-scaffolding.md)
- [GH-079 — Publish generated API reference and compatibility documentation source](../m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md)
- [GH-082 — Run the complete dual-dialect end-to-end matrix](../m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)
- [GH-089 — Record the official HTMX 4 GA source snapshot](../m7/gh-089-record-the-official-htmx-4-ga-source-snapshot.md)


## Suggested files

- `docs/okf/delivery/gates/m3.md`
- `docs/compatibility/matrix.md`
- `docs/okf/log.md`

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
Stable ID: GH-056
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
