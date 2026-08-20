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

- [ ] Generated project installs, typechecks, tests, builds, and runs in a clean temporary directory.
- [ ] Default project works with JavaScript disabled for core navigation/form flow.
- [ ] Generated source contains no React/hydration runtime.
- [ ] Experimental option emits a prominent maturity notice and exact pin.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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
