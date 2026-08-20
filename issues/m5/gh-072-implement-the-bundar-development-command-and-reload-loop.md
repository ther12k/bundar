---
type: GitHub Issue Specification
title: GH-072 — Implement the Bundar development command and reload loop
description: '`bundar dev` runs the Bun application with fast reload, clear diagnostics, and no hidden build system.'
tags:
- github-issue
- m5
- cli
- feature
- p1
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-072
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:feature
  - area:cli
  - priority:p1
  - size:l
  priority: p1
  size: l
  depends_on:
  - GH-015
  - GH-070
  blocks: []
---

# GH-072 — Implement the Bundar development command and reload loop

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:feature`, `area:cli`, `priority:p1`, `size:l`  
**Priority:** `P1`  
**Size:** `L`

## Outcome

`bundar dev` runs the Bun application with fast reload, clear diagnostics, and no hidden build system.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Invoke Bun watch/hot facilities through a documented process model.
- Detect app entry and configuration explicitly.
- Print route/config errors before accepting traffic where possible.
- Handle signals and child cleanup reliably.

## Out of scope

- Replacing Bun’s bundler or HMR engine.

## Acceptance criteria

- [ ] Editing route/component files triggers the documented reload behavior.
- [ ] Syntax or compile failures are visible and do not leave duplicate listeners.
- [ ] SIGINT/SIGTERM clean up child processes.
- [ ] Production command remains separate from development behavior.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/cli/test/dev/**
bun run test:dev-loop
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-015 — Compile Bundar routes to Bun.serve native route tables](../m1/gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)
- [GH-070 — Create the Bundar CLI package and command framework](gh-070-create-the-bundar-cli-package-and-command-framework.md)

## Blocks

- None in this delivery graph.


## Suggested files

- `packages/cli/src/commands/dev.ts`
- `packages/cli/src/process/**`
- `packages/cli/test/dev/**`

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
Stable ID: GH-072
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
