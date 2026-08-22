---
type: GitHub Issue Specification
title: GH-084 — Audit package contents, dependencies, licenses, and size
description: Every release package contains only intended files, satisfies dependency policy, has reviewed licenses, and stays within approved size budgets.
tags:
- github-issue
- m6
- release
- security
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-084
  milestone: M6 — Alpha Readiness
  labels:
  - type:security
  - area:release
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-081
  blocks:
  - GH-085
  - GH-087
---

# GH-084 — Audit package contents, dependencies, licenses, and size

**Milestone:** M6 — Alpha Readiness  
**Labels:** `type:security`, `area:release`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Every release package contains only intended files, satisfies dependency policy, has reviewed licenses, and stays within approved size budgets.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Pack every public package and inventory files, compressed/unpacked size, dependencies, licenses, exports, source maps, and declarations.
- Scan for secrets, fixtures, private paths, and accidental build artifacts.
- Review zero-runtime-dependency claims for core and JSX.
- Generate machine-readable package bill of materials.

## Out of scope

- Publishing artifacts.

## Acceptance criteria

- [x] No secret or private test fixture is present.
- [x] All runtime/transitive licenses are approved and attributed.
- [x] Package exports resolve under a clean consumer.
- [x] Size exceptions have an ADR or release blocker.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run pack:all
bun run pack:audit
bun run licenses:check
bun run secrets:scan
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-081 — Run the M5 developer-experience usability gate](../m5/gh-081-run-the-m5-developer-experience-usability-gate.md)

## Blocks

- [GH-085 — Generate SBOM, provenance, checksums, and reproducible build evidence](gh-085-generate-sbom-provenance-checksums-and-reproducible-build-evidence.md)
- [GH-087 — Write alpha release notes, compatibility statement, and known limitations](gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md)


## Suggested files

- `artifacts/packages/**`
- `artifacts/licenses.json`
- `docs/okf/delivery/gates/package-audit.md`

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
Stable ID: GH-084
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

Stable ID: GH-084
Commit / PR: merged `gh-084-package-audit` into `main` (merge commit recorded in `log.md`).
Files changed: `tools/pack-audit.ts` (new) + `pack:all`/`pack:audit`/`licenses:check`/`secrets:scan` scripts, `artifacts/packages/bom.json` + `artifacts/licenses.json` (committed), `delivery/gates/package-audit.md` (new), `evidence/gh-084/verification-transcript.md`.
Commands executed: `pack:audit` exit 0 — 8 packages, 513KB unpacked, 0 findings, all MIT, all within budget, zero-dep claims verified from packed manifests; alias modes exit 0; full suite 827/827; typecheck; lint; format; build; docs — all exit 0.
Evidence: `evidence/gh-084/verification-transcript.md`; `artifacts/packages/bom.json`; `delivery/gates/package-audit.md`.
Contract/API changes: none to packages (audit tooling + artifacts).
Security/performance impact: supply-chain posture — secrets/private-path/fixture/artifact scans over packed content; license attribution; SHA-256 tarball hashes in the BOM for GH-085 provenance.
Remaining risks: budgets intentionally generous at alpha; consumer-resolution proof references the GH-081 cleanroom (same artifacts).
Documentation updated: `delivery/gates/package-audit.md`, this closure record, `issues/m6/index.md`, `log.md`.
Newly unblocked issues: GH-085, GH-087.
