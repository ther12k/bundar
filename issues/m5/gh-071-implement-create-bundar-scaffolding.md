---
type: GitHub Issue Specification
title: GH-071 — Implement create-bundar scaffolding
description: A developer can generate a minimal, runnable, secure-by-default Bundar application with explicit dialect selection.
tags:
- github-issue
- m5
- cli
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-071
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:feature
  - area:cli
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-038
  - GH-056
  - GH-069
  - GH-070
  blocks:
  - GH-075
---

# GH-071 — Implement create-bundar scaffolding

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:feature`, `area:cli`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

A developer can generate a minimal, runnable, secure-by-default Bundar application with explicit dialect selection.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement interactive and non-interactive project creation.
- Generate package metadata, pinned Bun requirement, TSX config, app bootstrap, layout, health route, form example, tests, and local HTMX asset setup.
- Support stable htmx2 default and clearly experimental htmx4 selection.
- Validate target directory and avoid overwriting user files.

## Out of scope

- Dozens of framework templates or database choices.

## Acceptance criteria

- [x] Generated project installs, typechecks, tests, builds, and runs in a clean temporary directory.
- [x] Default project works with JavaScript disabled for core navigation/form flow.
- [x] Generated source contains no React/hydration runtime.
- [x] Experimental option emits a prominent maturity notice and exact pin.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/cli/test/create/**
bun run test:scaffold -- htmx2
bun run test:scaffold -- htmx4-experimental
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-038 — Run and record the M2 server-JSX gate](../m2/gh-038-run-and-record-the-m2-server-jsx-gate.md)
- [GH-056 — Run the M3 zero-handler-change dialect-switch gate](../m3/gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md)
- [GH-069 — Run the M4 progressive-workflow security gate](../m4/gh-069-run-the-m4-progressive-workflow-security-gate.md)
- [GH-070 — Create the Bundar CLI package and command framework](gh-070-create-the-bundar-cli-package-and-command-framework.md)

## Blocks

- [GH-075 — Create and verify the minimal starter template](gh-075-create-and-verify-the-minimal-starter-template.md)


## Suggested files

- `packages/cli/src/commands/create.ts`
- `templates/minimal/**`
- `packages/cli/test/create/**`

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
Stable ID: GH-071
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

Stable ID: GH-071
Commit / PR: merged `gh-071-create-bundar` into `main` (merge commit recorded in `log.md`).
Files changed: `create-bundar/templates/minimal.ts` (new), `create-bundar/src/{index,cli,bin}.ts` (new), `create-bundar/test/create/{generator,cli}.test.ts` (new, 13 tests), `tools/test-scaffold.ts` (new) + `test:scaffold` script, manifest/tsconfig/README updates, root tsconfig path, `evidence/gh-071/verification-transcript.md`.
Commands executed: `bun test create-bundar` 13/13; `test:scaffold -- htmx2` and `-- htmx4-experimental` both exit 0 (generate→install→typecheck→test 4/4→build→run with live no-JS PRG + enhanced fragment + 422 assertions, lockfile restored); full suite 756/756; typecheck; lint; format; architecture (86 files); pack:inspect create-bundar; api:check; build; docs — all exit 0. Tooling decisions: (1) workspace-mounted verification pre-npm with byte-identical lockfile restore; (2) tests relocated from the planned packages/cli path per the frozen relative-escape rule (caught by the boundary harness). Both recorded in the transcript.
Evidence: `evidence/gh-071/verification-transcript.md`.
Contract/API changes: new `create-bundar` package surface (createProject, ScaffoldDialect, ScaffoldError, notice text) + `bin`. No framework-package API changes (api:check match).
Security/performance impact: none at runtime (scaffolding tool). Generated apps are secure-by-default: app-owned ErrorBoundary with production opacity, bounded parsing via parseForm, PRG fallback, local pinned htmx asset (no CDN), no React.
Remaining risks: pre-npm `workspace:*` deps until M6 publication tooling; interactive prompts verified via injected prompt (no CI TTY). Documented.
Documentation updated: `create-bundar/README.md`, this closure record, `issues/m5/index.md`, `log.md`.
Newly unblocked issues: GH-075 (minimal starter template).
