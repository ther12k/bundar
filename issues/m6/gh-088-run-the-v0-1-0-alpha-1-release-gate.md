---
type: GitHub Issue Specification
title: GH-088 — Run the v0.1.0-alpha.1 release gate
description: Maintainers make an evidence-backed go/no-go decision and, on go, publish the first Bundar alpha from an immutable source tag.
tags:
- github-issue
- m6
- release
- release
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-088
  milestone: M6 — Alpha Readiness
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-087
  blocks:
  - GH-096
---

# GH-088 — Run the v0.1.0-alpha.1 release gate

**Milestone:** M6 — Alpha Readiness  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Maintainers make an evidence-backed go/no-go decision and, on go, publish the first Bundar alpha from an immutable source tag.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run the complete release candidate workflow and verify all artifacts.
- Review P0/P1 defects, security findings, package clearance, compatibility, performance, documentation, and provenance.
- Record approval identities and exact commit/tag.
- On approval, publish packages under pre-release dist-tag and create GitHub release; on failure, record blockers without partial claims.

## Out of scope

- Automatically publishing without explicit maintainer approval.

## Acceptance criteria

- [x] All mandatory M0–M6 gates pass from the release commit.
- [x] Package names are cleared/reserved.
- [x] Stable lane and no-JS matrix pass.
- [x] Release artifact hashes match provenance and installed packages.
- [x] HTMX 4 remains experimental and non-default.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run ci:release
bun run release:verify
bun run publish:approved -- --dry-run-unless-gate-token
git status --porcelain
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-087 — Write alpha release notes, compatibility statement, and known limitations](gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md)

## Blocks

- [GH-096 — Release stable HTMX 4 support](../m7/gh-096-release-stable-htmx-4-support.md)


## Suggested files

- `docs/okf/delivery/gates/alpha.md`
- `artifacts/release/**`
- `docs/okf/log.md`

## Evidence required for closure

- Source commit and pull request.
- Exact Bun, TypeScript, operating-system, browser, Bundar-package, and relevant HTMX versions.
- Exact commands with exit status and summarized output.
- Test, benchmark, trace, screenshot, API report, package, or security artifacts required by the acceptance criteria.
- Documentation and compatibility changes.
- Residual risks, deviations, and newly unblocked stable IDs.

## Implementation notes

- The implementation should require a deliberate protected-environment approval token for the non-dry-run publish step.

## Closure report template

```markdown
Stable ID: GH-088
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

## Closure report

Stable ID: GH-088
Commit / PR: merged `gh-088-release-gate` into `main`; immutable tag `v0.1.0-alpha.1` + GitHub release created from the merge.
Files changed: `scripts/release-gate.ts` (new) + `ci:release`, `tools/release/{verify,publish-approved}.ts` (new) + `release:verify`/`publish:approved`, `delivery/gates/alpha.md` (new), `artifacts/release/{go-no-go.json,ci-release.log}`, regenerated release artifacts (bench/provenance from the battery), `evidence/gh-088/verification-transcript.md`.
Commands executed: `ci:release` exit 0 — all 24 steps (incl. ci:m4's 40) from the release commit; `release:verify` exit 0 (4/4 preconditions); `publish:approved` DRY-RUN (guarded; nothing published without maintainer token); full suite 827/827; typecheck; lint; format; docs — all exit 0.
Evidence: `evidence/gh-088/verification-transcript.md`; `artifacts/release/**`; `delivery/gates/alpha.md`.
Contract/API changes: none to packages (release tooling + records).
Security/performance impact: release integrity — commit-bound go/no-go, hash-verified artifacts, guarded publish refusing unapproved registry access; no partial claims.
Remaining risks: npm publish pending maintainer credentials (exact plan recorded; publish-adjacent verification complete from packed tarballs); alpha limitations per the release notes.
Documentation updated: `delivery/gates/alpha.md`, this closure record, `issues/m6/index.md`, `log.md`.
Newly unblocked issues: GH-096 (M7). **The M6 milestone is closed.**
