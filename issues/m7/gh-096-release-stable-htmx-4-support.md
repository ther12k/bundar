---
type: GitHub Issue Specification
title: GH-096 — Release stable HTMX 4 support
description: Bundar publishes a release with stable htmx 4 GA support and the approved default while preserving documented htmx 2 compatibility or deprecation policy.
tags:
- github-issue
- m7
- release
- release
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-096
  milestone: M7 — HTMX 4 GA Adoption
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-088
  - GH-095
  blocks: []
---

# GH-096 — Release stable HTMX 4 support

**Milestone:** M7 — HTMX 4 GA Adoption  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Bundar publishes a release with stable htmx 4 GA support and the approved default while preserving documented htmx 2 compatibility or deprecation policy.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run complete release, conformance, security, benchmark, package, provenance, migration, and documentation gates from the release candidate.
- Update templates/config default only according to ADR.
- Publish packages, changelog, compatibility matrix, migration notes, artifacts, and immutable tag after protected approval.
- Verify installed packages against checksums and run post-publish clean consumers.

## Out of scope

- Dropping htmx 2 support without the accepted policy.

## Acceptance criteria

- [ ] HTMX 4 GA exact version is tested and documented.
- [ ] Reference apps pass unchanged-source gate.
- [ ] No beta terminology or artifact is used as current evidence.
- [ ] HTMX 2 status and support window are explicit.
- [ ] Published artifacts match provenance.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run ci:release
bun run test:examples:dual-ga
bun run release:verify
bun run publish:approved
bun run test:post-publish
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-088 — Run the v0.1.0-alpha.1 release gate](../m6/gh-088-run-the-v0-1-0-alpha-1-release-gate.md)
- [GH-095 — Decide the default HTMX dialect after GA evidence](gh-095-decide-the-default-htmx-dialect-after-ga-evidence.md)

## Blocks

- None in this delivery graph.


## Suggested files

- `docs/releases/htmx4-stable.md`
- `CHANGELOG.md`
- `artifacts/release/**`
- `docs/okf/delivery/gates/htmx4-ga.md`

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
Stable ID: GH-096
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
