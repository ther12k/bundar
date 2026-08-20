---
type: GitHub Issue Specification
title: GH-087 — Write alpha release notes, compatibility statement, and known limitations
description: The first alpha communicates exactly what is implemented, measured, experimental, unsupported, and expected to change.
tags:
- github-issue
- m6
- release
- docs
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-087
  milestone: M6 — Alpha Readiness
  labels:
  - type:docs
  - area:release
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-082
  - GH-083
  - GH-084
  - GH-085
  - GH-086
  blocks:
  - GH-088
---

# GH-087 — Write alpha release notes, compatibility statement, and known limitations

**Milestone:** M6 — Alpha Readiness  
**Labels:** `type:docs`, `area:release`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

The first alpha communicates exactly what is implemented, measured, experimental, unsupported, and expected to change.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Write release notes and changelog entry from accepted issues.
- State minimum Bun version, supported package/browser matrix, default htmx 2 version, exact experimental htmx 4 beta version, and no-JS support.
- Publish benchmark methodology and links without inflated claims.
- List security, API stability, streaming, extension, deployment, and migration limitations.

## Out of scope

- Future roadmap promises without approved issues.

## Acceptance criteria

- [ ] No beta feature is described as stable or GA.
- [ ] Every compatibility claim links to executed evidence.
- [ ] Breaking-change expectations for pre-1.0 are explicit.
- [ ] Upgrade and rollback instructions are present.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run docs:check
bun run release:notes-check
bun run links:artifacts
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-082 — Run the complete dual-dialect end-to-end matrix](gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)
- [GH-083 — Run final alpha performance and regression budgets](gh-083-run-final-alpha-performance-and-regression-budgets.md)
- [GH-084 — Audit package contents, dependencies, licenses, and size](gh-084-audit-package-contents-dependencies-licenses-and-size.md)
- [GH-085 — Generate SBOM, provenance, checksums, and reproducible build evidence](gh-085-generate-sbom-provenance-checksums-and-reproducible-build-evidence.md)
- [GH-086 — Run npm publication dry runs and export-map verification](gh-086-run-npm-publication-dry-runs-and-export-map-verification.md)

## Blocks

- [GH-088 — Run the v0.1.0-alpha.1 release gate](gh-088-run-the-v0-1-0-alpha-1-release-gate.md)


## Suggested files

- `CHANGELOG.md`
- `docs/releases/v0.1.0-alpha.1.md`
- `docs/compatibility/matrix.md`

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
Stable ID: GH-087
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
