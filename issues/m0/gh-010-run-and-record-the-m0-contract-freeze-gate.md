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

- [x] All dependencies are complete with evidence.
- [x] No P0/open naming, security, architecture, or documentation integrity blocker remains; publication/legal reservations remain explicitly outside M0.
- [x] HTMX 4 is clearly labeled experimental.
- [x] The gate record names the exact commit authorized for implementation.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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

## Closure record (2026-08-21)

Stable ID: GH-010
Commit / PR: authorized implementation commit `fe6139e409d62833a816117cee9cc482cec6a762`; closure metadata commit `781ac82`; main merge SHA is recorded in the final post-merge closure update.
Files changed: `scripts/m0-gate.ts`, `package.json`, `delivery/gates/m0.md`, `delivery/index.md`, `evidence/gh-006/verification-transcript.md`, `evidence/gh-010/verification-transcript.md`, GH-006/GH-008 closure records, GH-009 final-state evidence, `issues/m0/index.md`, and `log.md`.
Commands executed: `bun install --frozen-lockfile`, `bun run ci:m0`, `bun run docs:validate`, and `bun run architecture:check`; the canonical gate passed all 17 ordered steps. The gate includes format, lint, typecheck, docs/links/graph/governance, architecture tests/check, benchmark smoke/parity, both browser lanes/report, full tests, and build.
Evidence: `evidence/gh-010/verification-transcript.md`, `evidence/gh-010/ci-m0-output.txt`, `evidence/gh-010/install-output.txt`, `delivery/gates/m0.md`, and dependency transcripts under `evidence/gh-004` through `evidence/gh-009`.
Contract/API changes: adds only the canonical M0 validation command and gate documentation; no production HTTP, JSX, HTMX, or runtime API implementation.
Security/performance impact: no security certification, performance claim, publication authorization, or htmx 4 GA claim; all accepted residual risks are listed in the gate concept and transcript.
Remaining risks: temporary/unreserved naming, deferred exact signatures, source-text boundary enforcement, local-only browser tooling, in-process benchmark scope, and htmx 4 beta lifecycle/streaming limitations remain future-gate work.
Documentation updated: `delivery/gates/m0.md`, `delivery/index.md`, `issues/m0/index.md`, `log.md`, GH-006/GH-008 closure records, GH-009 final-state transcript, and compatibility/browser references.
Newly unblocked issues: GH-011, GH-026, GH-039, and GH-070.
