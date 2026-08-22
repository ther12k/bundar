---
type: GitHub Issue Specification
title: GH-081 — Run the M5 developer-experience usability gate
description: A fresh user workflow proves that the CLI, template, examples, typed routes, testing tools, and documentation can be followed without maintainer knowledge.
tags:
- github-issue
- m5
- testing
- test
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-081
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-080
  blocks:
  - GH-082
  - GH-084
---

# GH-081 — Run the M5 developer-experience usability gate

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

A fresh user workflow proves that the CLI, template, examples, typed routes, testing tools, and documentation can be followed without maintainer knowledge.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define a clean-environment scripted journey from scaffold to tested form feature.
- Run at least one maintainer-blind review or simulated fresh checkout.
- Measure install/setup steps, typecheck latency, error clarity, and documentation gaps.
- Resolve P0/P1 usability blockers or record blocking issues.

## Out of scope

- Broad community survey before public alpha.

## Acceptance criteria

- [x] The scripted journey succeeds from packed artifacts, not workspace-only imports.
- [x] A user can identify and fix a deliberate route/schema error from diagnostics.
- [x] Both dialect selection paths are documented; v4 remains experimental.
- [x] No hidden global tool or unpublished package is required.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:dx-cleanroom
bun run test:pack-consumers
bun run docs:snippets
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-080 — Write getting-started, architecture, security, and HTMX migration guides](gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md)

## Blocks

- [GH-082 — Run the complete dual-dialect end-to-end matrix](../m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)
- [GH-084 — Audit package contents, dependencies, licenses, and size](../m6/gh-084-audit-package-contents-dependencies-licenses-and-size.md)


## Suggested files

- `tests/dx/**`
- `artifacts/dx/m5-report.md`
- `docs/okf/delivery/gates/m5.md`

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
Stable ID: GH-081
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

Stable ID: GH-081
Commit / PR: merged `gh-081-m5-gate` into `main` (merge commit recorded in `log.md`).
Files changed: `tools/dx-cleanroom.ts` (new) + `test:dx-cleanroom`, `tools/pack-consumers.ts` (new) + `test:pack-consumers`, `artifacts/dx/m5-report.md` (new, generated), `delivery/gates/m5.md` (new), create-bundar template fixes (default export + named routes — defects found BY the gate), `evidence/gh-081/verification-transcript.md`.
Commands executed: `test:dx-cleanroom` exit 0 (17 measured steps: packed-registry → generated app → install/typecheck/test/build/routes/live-HTTP → deliberate-drift diagnostic); `test:pack-consumers` 8/8; `docs:snippets` 7/7; scaffold/template/guide batteries re-verified; full suite 824/824; typecheck; lint; format; architecture; build; docs — all exit 0.
Evidence: `evidence/gh-081/verification-transcript.md`; `artifacts/dx/m5-report.md`; `delivery/gates/m5.md`.
Contract/API changes: create-bundar template now default-exports the App and names its routes (scaffolded apps support typed-URL generation and drift checks). No framework package changes.
Security/performance impact: none at runtime. The journey proves the packed-artifact install path and diagnostic quality.
Remaining risks: local file:-registry stands in for npm publication (GH-086, M6); timings are machine-local (documented).
Documentation updated: `delivery/gates/m5.md`, this closure record, `issues/m5/index.md`, `log.md`.
Newly unblocked issues: GH-082, GH-084 (M6 begins). **The M5 milestone is closed.**
