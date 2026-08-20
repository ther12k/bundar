---
type: GitHub Issue Specification
title: GH-078 — Implement the HTMX 2-to-4 audit and migration linter
description: A command identifies raw version-sensitive headers, events, inheritance, extensions, attributes, scripts, and response assumptions before a project changes dialect.
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
  stable_id: GH-078
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:feature
  - area:cli
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-046
  - GH-047
  - GH-070
  blocks:
  - GH-080
---

# GH-078 — Implement the HTMX 2-to-4 audit and migration linter

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:feature`, `area:cli`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

A command identifies raw version-sensitive headers, events, inheritance, extensions, attributes, scripts, and response assumptions before a project changes dialect.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement static scan of TS/TSX/HTML/config for known v2/v4-sensitive patterns.
- Read compiled route/asset manifests where useful.
- Classify findings as blocking, review, informational, or raw escape hatch.
- Emit human and JSON reports with file/line evidence and migration guidance.

## Out of scope

- Guaranteed semantic migration of arbitrary custom JavaScript.

## Acceptance criteria

- [ ] Fixtures cover header rename, event rename, implicit inheritance, `hx-ext`, history assumptions, error-response swap assumptions, asset pins, and raw adapter checks.
- [ ] Tool avoids rewriting source automatically in v0.1.
- [ ] False-positive suppression is explicit and auditable.
- [ ] Exit codes support CI migration gates.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/cli/test/htmx-audit/**
bun run htmx:audit fixtures/migration/v2-sensitive
bun run htmx:audit -- --format=json examples/todo
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-046 — Normalize HTMX lifecycle and application events](../m3/gh-046-normalize-htmx-lifecycle-and-application-events.md)
- [GH-047 — Add inheritance and extension compatibility helpers](../m3/gh-047-add-inheritance-and-extension-compatibility-helpers.md)
- [GH-070 — Create the Bundar CLI package and command framework](gh-070-create-the-bundar-cli-package-and-command-framework.md)

## Blocks

- [GH-080 — Write getting-started, architecture, security, and HTMX migration guides](gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md)


## Suggested files

- `packages/cli/src/commands/htmx-audit.ts`
- `packages/cli/src/audit/**`
- `fixtures/migration/**`

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
Stable ID: GH-078
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
