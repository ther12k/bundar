---
type: GitHub Issue Specification
title: GH-002 — Add governance, licensing, security, and contribution foundations
description: The repository has an explicit open-source governance and security baseline before accepting code or contributors.
tags:
- github-issue
- m0
- repo
- docs
- p0
- s
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-002
  milestone: M0 — Contracts & Foundation
  labels:
  - type:docs
  - area:repo
  - priority:p0
  - size:s
  priority: p0
  size: s
  depends_on:
  - GH-001
  blocks:
  - GH-004
  - GH-009
  - GH-085
---

# GH-002 — Add governance, licensing, security, and contribution foundations

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:docs`, `area:repo`, `priority:p0`, `size:s`  
**Priority:** `P0`  
**Size:** `S`

## Outcome

The repository has an explicit open-source governance and security baseline before accepting code or contributors.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Add the approved license, code of conduct, contribution guide, security policy, support policy, and maintainership rules.
- Document coordinated vulnerability disclosure and supported-release expectations.
- Add ownership rules for core, JSX, HTMX adapters, security-sensitive code, and releases.

## Out of scope

- Formation of a legal entity.
- Promises of long-term support before maintainers approve them.

## Acceptance criteria

- [ ] License identity matches package metadata.
- [ ] Security reports have a private path and no issue template encourages public zero-day disclosure.
- [ ] Contribution guide requires evidence and links to the OKF corpus.
- [ ] CODEOWNERS or equivalent review policy covers security and release paths.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
test -f LICENSE
test -f SECURITY.md
test -f CONTRIBUTING.md
bun run docs:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-001 — Initialize the Bun workspace and repository skeleton](gh-001-initialize-the-bun-workspace-and-repository-skeleton.md)

## Blocks

- [GH-004 — Clear the Bundar brand and public namespaces](gh-004-clear-the-bundar-brand-and-public-namespaces.md)
- [GH-009 — Configure GitHub labels, milestones, project fields, and automation](gh-009-configure-github-labels-milestones-project-fields-and-automation.md)
- [GH-085 — Generate SBOM, provenance, checksums, and reproducible build evidence](../m6/gh-085-generate-sbom-provenance-checksums-and-reproducible-build-evidence.md)


## Suggested files

- `LICENSE`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `.github/CODEOWNERS`

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
Stable ID: GH-002
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
