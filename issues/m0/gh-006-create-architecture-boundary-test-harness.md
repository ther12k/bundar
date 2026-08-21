---
type: GitHub Issue Specification
title: GH-006 — Create architecture-boundary test harness
description: Automated checks prevent forbidden dependency directions, accidental runtime dependencies, browser imports in server packages, and raw HTMX parsing outside adapters.
tags:
- github-issue
- m0
- testing
- test
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-006
  milestone: M0 — Contracts & Foundation
  labels:
  - type:test
  - area:testing
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-001
  - GH-005
  blocks:
  - GH-010
---

# GH-006 — Create architecture-boundary test harness

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:test`, `area:testing`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Automated checks prevent forbidden dependency directions, accidental runtime dependencies, browser imports in server packages, and raw HTMX parsing outside adapters.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define package-layer dependency rules.
- Add import graph checks and forbidden-pattern checks.
- Add fixtures that prove each rule fails when violated.
- Make boundary reports human-readable and CI-friendly.

## Out of scope

- Runtime security testing.
- General lint rules unrelated to architecture.

## Acceptance criteria

- [x] A core-to-HTMX dependency fails.
- [x] A React or hydration runtime import fails.
- [x] Raw `HX-*` header access outside approved adapter/test paths fails.
- [x] A valid package graph passes on the configured supported CI platform (Ubuntu Linux).
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test tests/architecture
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-001 — Initialize the Bun workspace and repository skeleton](gh-001-initialize-the-bun-workspace-and-repository-skeleton.md)
- [GH-005 — Freeze public API principles and package boundaries](gh-005-freeze-public-api-principles-and-package-boundaries.md)

## Blocks

- [GH-010 — Run and record the M0 contract-freeze gate](gh-010-run-and-record-the-m0-contract-freeze-gate.md)


## Suggested files

- `tools/architecture-check/**`
- `tests/architecture/**`
- `package.json`

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
Stable ID: GH-006
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

Stable ID: GH-006
Commit / PR: implementation commit `b6f1e96`, merged to `main` by merge commit `abb6041`.
Files changed: `tools/architecture-check/{engine.ts,check.ts,boundaries.json}`, `tests/architecture/boundary-harness.test.ts`, and the GH-006 governance/evidence records.
Commands executed: `bun test tests/architecture` — 13 pass, 0 fail; `bun run architecture:check` — 7 source files and 7 package rules enforced; both exit 0 on Bun `1.4.0`, TypeScript `6.0.3`, Linux x86_64.
Evidence: `evidence/gh-006/verification-transcript.md`; adversarial fixtures cover forbidden core-to-HTMX imports, React/hydration imports, dynamic external imports, raw `HX-*` and `htmx:*` strings, relative escapes, and valid imports.
Contract/API changes: machine-readable package dependency directions and raw-HTMX confinement are enforced; no runtime package API changes.
Security/performance impact: the harness rejects forbidden runtime dependencies and raw protocol parsing outside the adapter boundary; no security certification or performance claim is made.
Remaining risks: validation is source-text/import-graph enforcement rather than a full semantic compiler or cross-platform GitHub Actions result; the current configured CI platform is Ubuntu Linux.
Documentation updated: `evidence/gh-006/verification-transcript.md`, this closure record, `issues/m0/index.md`, and `log.md`.
Newly unblocked issues: GH-010 M0 contract-freeze gate.
