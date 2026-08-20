---
type: GitHub Issue Specification
title: GH-010 — Run and record the M0 contract-freeze gate
description: Maintainers approve a coherent, validated implementation contract and explicitly authorize M1–M3 work.
tags:
- github-issue
- m0
- release
- release
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-010
  milestone: M0 — Contracts & Foundation
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-004
  - GH-005
  - GH-006
  - GH-007
  - GH-008
  - GH-009
  blocks:
  - GH-011
  - GH-026
  - GH-039
  - GH-070
---

# GH-010 — Run and record the M0 contract-freeze gate

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Maintainers approve a coherent, validated implementation contract and explicitly authorize M1–M3 work.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run all M0 validation, boundary, benchmark-smoke, and browser-smoke commands.
- Review unresolved decisions and risks.
- Record accepted contract versions, toolchain versions, exceptions, and evidence links.
- Open blockers instead of waiving failed mandatory gates.

## Out of scope

- Implementation of HTTP, JSX, or HTMX production packages.

## Acceptance criteria

- [ ] All dependencies are complete with evidence.
- [ ] No P0/open naming, security, architecture, or documentation integrity blocker remains.
- [ ] HTMX 4 is clearly labeled experimental.
- [ ] The gate record names the exact commit authorized for implementation.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun install --frozen-lockfile
bun run ci:m0
bun run docs:validate
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-004 — Clear the Bundar brand and public namespaces](gh-004-clear-the-bundar-brand-and-public-namespaces.md)
- [GH-005 — Freeze public API principles and package boundaries](gh-005-freeze-public-api-principles-and-package-boundaries.md)
- [GH-006 — Create architecture-boundary test harness](gh-006-create-architecture-boundary-test-harness.md)
- [GH-007 — Create benchmark harness with raw Bun and Hono baselines](gh-007-create-benchmark-harness-with-raw-bun-and-hono-baselines.md)
- [GH-008 — Create browser conformance harness for HTMX 2 and HTMX 4 lanes](gh-008-create-browser-conformance-harness-for-htmx-2-and-htmx-4-lanes.md)
- [GH-009 — Configure GitHub labels, milestones, project fields, and automation](gh-009-configure-github-labels-milestones-project-fields-and-automation.md)

## Blocks

- [GH-011 — Create the @bundar/core package skeleton](../m1/gh-011-create-the-bundar-core-package-skeleton.md)
- [GH-026 — Create the @bundar/jsx package and JSX type surface](../m2/gh-026-create-the-bundar-jsx-package-and-jsx-type-surface.md)
- [GH-039 — Create @bundar/htmx and the version-neutral protocol model](../m3/gh-039-create-bundar-htmx-and-the-version-neutral-protocol-model.md)
- [GH-070 — Create the Bundar CLI package and command framework](../m5/gh-070-create-the-bundar-cli-package-and-command-framework.md)


## Suggested files

- `docs/okf/delivery/gates/m0.md`
- `docs/okf/log.md`

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
Stable ID: GH-010
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
