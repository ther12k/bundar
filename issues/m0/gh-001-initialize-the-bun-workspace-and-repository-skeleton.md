---
type: GitHub Issue Specification
title: GH-001 — Initialize the Bun workspace and repository skeleton
description: A reproducible Bun 1.4+ monorepo exists with package boundaries, pinned toolchain metadata, and one green no-op CI path.
tags:
- github-issue
- m0
- repo
- chore
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-001
  milestone: M0 — Contracts & Foundation
  labels:
  - type:chore
  - area:repo
  - priority:p0
  - size:m
  - status:ready
  priority: p0
  size: m
  depends_on: []
  blocks:
  - GH-002
  - GH-003
  - GH-004
  - GH-006
  - GH-007
  - GH-008
---

# GH-001 — Initialize the Bun workspace and repository skeleton

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:chore`, `area:repo`, `priority:p0`, `size:m`, `status:ready`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

A reproducible Bun 1.4+ monorepo exists with package boundaries, pinned toolchain metadata, and one green no-op CI path.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create root package metadata, Bun lockfile, workspace configuration, TypeScript base configuration, package and example directories.
- Pin the minimum Bun version and add a preflight that fails clearly on unsupported runtimes.
- Add root format, lint, typecheck, test, build, and clean scripts without hiding failures.

## Out of scope

- Framework routing, JSX rendering, or HTMX behavior.
- Publishing packages.

## Acceptance criteria

- [ ] A fresh checkout installs with the documented Bun command and no Node package manager is required.
- [ ] Every planned public package directory exists but contains no invented implementation.
- [ ] Root scripts execute successfully on the empty skeleton.
- [ ] Generated files, caches, credentials, and release artifacts are excluded intentionally.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun --version
bun install --frozen-lockfile
bun run format:check
bun run typecheck
bun test
bun run build
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- None; this is a graph root.

## Blocks

- [GH-002 — Add governance, licensing, security, and contribution foundations](gh-002-add-governance-licensing-security-and-contribution-foundations.md)
- [GH-003 — Install the OKF documentation corpus and local validator](gh-003-install-the-okf-documentation-corpus-and-local-validator.md)
- [GH-004 — Clear the Bundar brand and public namespaces](gh-004-clear-the-bundar-brand-and-public-namespaces.md)
- [GH-006 — Create architecture-boundary test harness](gh-006-create-architecture-boundary-test-harness.md)
- [GH-007 — Create benchmark harness with raw Bun and Hono baselines](gh-007-create-benchmark-harness-with-raw-bun-and-hono-baselines.md)
- [GH-008 — Create browser conformance harness for HTMX 2 and HTMX 4 lanes](gh-008-create-browser-conformance-harness-for-htmx-2-and-htmx-4-lanes.md)


## Suggested files

- `package.json`
- `bun.lock`
- `tsconfig.base.json`
- `packages/*/package.json`
- `examples/*`
- `.gitignore`

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
Stable ID: GH-001
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
