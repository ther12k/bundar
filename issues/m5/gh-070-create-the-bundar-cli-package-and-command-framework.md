---
type: GitHub Issue Specification
title: GH-070 — Create the Bundar CLI package and command framework
description: A small Bun-native CLI provides deterministic command parsing, diagnostics, version reporting, and extension points for project tooling.
tags:
- github-issue
- m5
- cli
- feature
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-070
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:feature
  - area:cli
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-010
  blocks:
  - GH-071
  - GH-072
  - GH-073
  - GH-074
  - GH-078
---

# GH-070 — Create the Bundar CLI package and command framework

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:feature`, `area:cli`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

A small Bun-native CLI provides deterministic command parsing, diagnostics, version reporting, and extension points for project tooling.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create `@bundar/cli` package and `bundar` binary.
- Implement help, version, environment diagnostics, structured exit codes, and command registration.
- Avoid a large CLI framework dependency unless evidence and ADR justify it.
- Add shell/process integration tests.

## Out of scope

- Scaffolding, dev server, and code generation commands.

## Acceptance criteria

- [ ] `bunx bundar --help` and `--version` work from a packed fixture.
- [ ] Unknown commands and invalid options exit nonzero with useful messages.
- [ ] CLI reports Bun, Bundar package, platform, and selected adapter versions without leaking environment secrets.
- [ ] Runtime dependencies satisfy the approved policy.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/cli
bun run pack:consumer -- @bundar/cli
bunx ./packages/cli --help
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-010 — Run and record the M0 contract-freeze gate](../m0/gh-010-run-and-record-the-m0-contract-freeze-gate.md)

## Blocks

- [GH-071 — Implement create-bundar scaffolding](gh-071-implement-create-bundar-scaffolding.md)
- [GH-072 — Implement the Bundar development command and reload loop](gh-072-implement-the-bundar-development-command-and-reload-loop.md)
- [GH-073 — Generate route manifests and typed URL builders](gh-073-generate-route-manifests-and-typed-url-builders.md)
- [GH-074 — Implement the in-process test client and request helpers](gh-074-implement-the-in-process-test-client-and-request-helpers.md)
- [GH-078 — Implement the HTMX 2-to-4 audit and migration linter](gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md)


## Suggested files

- `packages/cli/package.json`
- `packages/cli/src/main.ts`
- `packages/cli/src/commands/**`
- `packages/cli/test/**`

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
Stable ID: GH-070
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
