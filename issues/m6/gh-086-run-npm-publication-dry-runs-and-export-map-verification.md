---
type: GitHub Issue Specification
title: GH-086 — Run npm publication dry runs and export-map verification
description: Every package can be installed from a tarball using the approved namespace, version, exports, declarations, and peer dependency metadata before any registry publish.
tags:
- github-issue
- m6
- release
- release
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-086
  milestone: M6 — Alpha Readiness
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-085
  blocks:
  - GH-087
---

# GH-086 — Run npm publication dry runs and export-map verification

**Milestone:** M6 — Alpha Readiness  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Every package can be installed from a tarball using the approved namespace, version, exports, declarations, and peer dependency metadata before any registry publish.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run pack and clean-consumer installs for all public entry points.
- Verify ESM/Bun resolution, JSX runtime paths, CLI binary, adapter subpaths, types, files allow-list, README, license, and repository metadata.
- Simulate pre-release versioning and dist-tag plan.
- Confirm namespace decision from GH-004.

## Out of scope

- Executing `npm publish`.

## Acceptance criteria

- [ ] All documented imports resolve in clean consumers.
- [ ] No workspace protocol or unpublished internal path leaks into tarballs.
- [ ] The CLI executes from the tarball.
- [ ] No real registry publish occurs in this issue.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run publish:dry-run
bun run test:pack-consumers
bun run exports:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-085 — Generate SBOM, provenance, checksums, and reproducible build evidence](gh-085-generate-sbom-provenance-checksums-and-reproducible-build-evidence.md)

## Blocks

- [GH-087 — Write alpha release notes, compatibility statement, and known limitations](gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md)


## Suggested files

- `tools/release/**`
- `tests/pack-consumers/**`
- `artifacts/publish-dry-run.md`

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
Stable ID: GH-086
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
