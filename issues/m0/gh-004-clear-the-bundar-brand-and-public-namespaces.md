---
type: GitHub Issue Specification
title: GH-004 — Clear the Bundar brand and public namespaces
description: Maintainers have evidence for using Bundar publicly or an approved fallback name and package namespace before publication.
tags:
- github-issue
- m0
- repo
- decision
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-004
  milestone: M0 — Contracts & Foundation
  labels:
  - type:decision
  - area:repo
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-001
  - GH-002
  blocks:
  - GH-005
  - GH-010
---

# GH-004 — Clear the Bundar brand and public namespaces

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:decision`, `area:repo`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Maintainers have evidence for using Bundar publicly or an approved fallback name and package namespace before publication.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Search npm scopes/packages, GitHub organizations/repositories, relevant domains, social handles, package registries, and trademark databases.
- Record exact dates, jurisdictions checked, conflicts, ambiguity, and owner decision.
- Reserve approved namespaces where appropriate and define a fallback namespace that does not block private implementation.

## Out of scope

- Comprehensive legal opinion without qualified counsel.

## Acceptance criteria

- [x] No document treats a search result as legal advice.
- [x] The decision record distinguishes word meaning from trademark and namespace availability.
- [x] Package names and repository URLs are either reserved or explicitly temporary.
- [x] A rejected name has a documented migration path before external packages are published.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run docs:validate
test -f docs/okf/decisions/0015-brand-clearance.md
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-001 — Initialize the Bun workspace and repository skeleton](gh-001-initialize-the-bun-workspace-and-repository-skeleton.md)
- [GH-002 — Add governance, licensing, security, and contribution foundations](gh-002-add-governance-licensing-security-and-contribution-foundations.md)

## Blocks

- [GH-005 — Freeze public API principles and package boundaries](gh-005-freeze-public-api-principles-and-package-boundaries.md)
- [GH-010 — Run and record the M0 contract-freeze gate](gh-010-run-and-record-the-m0-contract-freeze-gate.md)


## Suggested files

- `docs/okf/decisions/0015-brand-clearance.md`
- `docs/okf/project/naming-and-brand.md`
- `package.json`

## Evidence required for closure

- Source commit and pull request.
- Exact Bun, TypeScript, operating-system, browser, Bundar-package, and relevant HTMX versions.
- Exact commands with exit status and summarized output.
- Test, benchmark, trace, screenshot, API report, package, or security artifacts required by the acceptance criteria.
- Documentation and compatibility changes.
- Residual risks, deviations, and newly unblocked stable IDs.

## Implementation notes

- This issue is a release blocker, not a blocker for local prototyping under a temporary namespace.

## Closure report template

```markdown
Stable ID: GH-004
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

## Closure record (2026-08-21)

Stable ID: GH-004
Commit / PR: branch `gh-004-brand-clearance`; no GitHub remote yet, so no PR number.
Files changed: `decisions/0015-brand-clearance.md` (new ADR), `decisions/index.md`, `project/naming-and-brand.md`, `evidence/gh-004/verification-transcript.md`, `log.md`, this issue file, `issues/m0/index.md`, `README.md`.
Commands executed: npm registry HTTP probes (7 identifiers, all 404), GitHub API probes (`users/bundar` 200 — org name blocked; `users/bundarjs`/`orgs/bundarjs` 404 — available), PyPI 404, crates.io 404, DNS NS status for 7 domains (`bundar.com` NOERROR/parked; `.dev/.org/.io/.app`, `bundarjs.org/.dev` NXDOMAIN), trademark web screening, `bun run docs:validate` (exit 0, 206 documents). Full outputs in the evidence transcript.
Evidence: `evidence/gh-004/verification-transcript.md`; decision in ADR-0015.
Contract/API changes: none. Package names remain temporary and `private`; the planned GitHub organization is `bundarjs` because a personal account holds the `bundar` name since 2016.
Security/performance impact: none.
Remaining risks: nothing is reserved — availability can change; official trademark databases (USPTO/EUIPO/WIPO/DGIP) and counsel review not done (announcement-gate precondition); social handles unchecked; DNS NXDOMAIN is not registrar proof.
Documentation updated: ADR-0015, `decisions/index.md`, `project/naming-and-brand.md`, `log.md`, README status.
Path deviation: decision record at `decisions/0015-brand-clearance.md` (repository-root OKF bundle, per GH-003) instead of the suggested `docs/okf/decisions/…`; stronger evidence because `docs:validate` now structurally validates the ADR.
Newly unblocked issues: GH-005.
