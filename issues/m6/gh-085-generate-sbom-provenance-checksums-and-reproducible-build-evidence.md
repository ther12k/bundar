---
type: GitHub Issue Specification
title: GH-085 — Generate SBOM, provenance, checksums, and reproducible build evidence
description: Release candidates have verifiable source, dependency, build, and artifact provenance suitable for public alpha distribution.
tags:
- github-issue
- m6
- release
- security
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-085
  milestone: M6 — Alpha Readiness
  labels:
  - type:security
  - area:release
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-002
  - GH-084
  blocks:
  - GH-086
  - GH-087
---

# GH-085 — Generate SBOM, provenance, checksums, and reproducible build evidence

**Milestone:** M6 — Alpha Readiness  
**Labels:** `type:security`, `area:release`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Release candidates have verifiable source, dependency, build, and artifact provenance suitable for public alpha distribution.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Generate SBOM for source and packages.
- Record source commit, Bun/tool versions, lockfile digest, build command, package checksums, and CI identity.
- Attempt clean rebuild comparison and document nondeterministic fields.
- Configure signed provenance/attestation workflow where repository capabilities allow.

## Out of scope

- Claiming a formal supply-chain assurance level not independently audited.

## Acceptance criteria

- [x] Every package tarball has a checksum and provenance link.
- [x] SBOM includes direct and transitive runtime/build dependencies.
- [x] Build does not require undocumented network resources beyond package install.
- [x] Reproducibility deviations are understood and documented.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run release:sbom
bun run release:provenance
bun run release:reproduce
sha256sum artifacts/packages/*.tgz
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-002 — Add governance, licensing, security, and contribution foundations](../m0/gh-002-add-governance-licensing-security-and-contribution-foundations.md)
- [GH-084 — Audit package contents, dependencies, licenses, and size](gh-084-audit-package-contents-dependencies-licenses-and-size.md)

## Blocks

- [GH-086 — Run npm publication dry runs and export-map verification](gh-086-run-npm-publication-dry-runs-and-export-map-verification.md)
- [GH-087 — Write alpha release notes, compatibility statement, and known limitations](gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md)


## Suggested files

- `artifacts/sbom/**`
- `artifacts/provenance/**`
- `.github/workflows/release.yml`

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
Stable ID: GH-085
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

Stable ID: GH-085
Commit / PR: merged `gh-085-sbom-provenance` into `main` (merge commit recorded in `log.md`).
Files changed: `tools/release/{sbom,provenance,reproduce}.ts` (new) + `release:sbom`/`release:provenance`/`release:reproduce` scripts, `artifacts/sbom/sbom.json`, `artifacts/provenance/{provenance,reproducibility}.json`, `artifacts/packages/{checksums.txt,*.tgz}` (committed), `evidence/gh-085/verification-transcript.md`.
Commands executed: `release:sbom` exit 0 (118 components); `release:provenance` exit 0 (8 subjects, commit-bound); `release:reproduce` exit 0 (8/8 reproducible); `sha256sum -c artifacts/packages/checksums.txt` 8/8 OK; full suite 827/827; typecheck; lint; format; docs — all exit 0.
Evidence: `evidence/gh-085/verification-transcript.md`; `artifacts/sbom/sbom.json`; `artifacts/provenance/**`.
Contract/API changes: none to packages (release tooling + artifacts).
Security/performance impact: supply-chain verifiability — checksummed artifacts, commit/toolchain/lockfile-bound provenance, full dependency SBOM; documented gzip-mtime nondeterminism; no assurance level claimed beyond evidence.
Remaining risks: unsigned attestations at current repo capability (signing wraps the existing statement shape); local-builder identity this run (CI fields auto-populate).
Documentation updated: this closure record, `issues/m6/index.md`, `log.md`.
Newly unblocked issues: GH-086, GH-087.
