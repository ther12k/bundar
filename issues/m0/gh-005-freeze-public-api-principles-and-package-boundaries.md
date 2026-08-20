---
type: GitHub Issue Specification
title: GH-005 — Freeze public API principles and package boundaries
description: A reviewed contract defines what belongs in core, JSX, HTMX, schema, security, CLI, testing, and examples before implementation spreads behavior across packages.
tags:
- github-issue
- m0
- core
- decision
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-005
  milestone: M0 — Contracts & Foundation
  labels:
  - type:decision
  - area:core
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-003
  - GH-004
  blocks:
  - GH-006
  - GH-007
  - GH-008
  - GH-010
  - GH-035
  - GH-039
  - GH-058
---

# GH-005 — Freeze public API principles and package boundaries

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:decision`, `area:core`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

A reviewed contract defines what belongs in core, JSX, HTMX, schema, security, CLI, testing, and examples before implementation spreads behavior across packages.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Approve public package map and dependency direction.
- Define explicit Request/Response handler contract, server-only JSX boundary, stable HTMX subset, and escape-hatch policy.
- Record forbidden dependencies and non-goals.
- Create an API change classification policy for pre-1.0 releases.

## Out of scope

- Freezing exact signatures that require implementation evidence.

## Acceptance criteria

- [x] Core and JSX zero-runtime-dependency policy is explicit.
- [x] No package creates a second router or hidden browser runtime.
- [x] HTMX version-specific details are confined to adapters and raw escape hatches.
- [x] Every planned public symbol has an owning package or is deliberately deferred.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run docs:validate
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-003 — Install the OKF documentation corpus and local validator](gh-003-install-the-okf-documentation-corpus-and-local-validator.md)
- [GH-004 — Clear the Bundar brand and public namespaces](gh-004-clear-the-bundar-brand-and-public-namespaces.md)

## Blocks

- [GH-006 — Create architecture-boundary test harness](gh-006-create-architecture-boundary-test-harness.md)
- [GH-007 — Create benchmark harness with raw Bun and Hono baselines](gh-007-create-benchmark-harness-with-raw-bun-and-hono-baselines.md)
- [GH-008 — Create browser conformance harness for HTMX 2 and HTMX 4 lanes](gh-008-create-browser-conformance-harness-for-htmx-2-and-htmx-4-lanes.md)
- [GH-010 — Run and record the M0 contract-freeze gate](gh-010-run-and-record-the-m0-contract-freeze-gate.md)
- [GH-035 — Add typed common HTMX attributes without runtime coupling](../m2/gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md)
- [GH-039 — Create @bundar/htmx and the version-neutral protocol model](../m3/gh-039-create-bundar-htmx-and-the-version-neutral-protocol-model.md)
- [GH-058 — Implement the Standard Schema validation adapter](../m4/gh-058-implement-the-standard-schema-validation-adapter.md)


## Suggested files

- `docs/okf/engineering/package-api.md`
- `docs/okf/architecture/system-overview.md`
- `docs/okf/decisions/0001-*.md`
- `docs/okf/decisions/0002-*.md`

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
Stable ID: GH-005
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

Stable ID: GH-005
Commit / PR: branch `gh-005-api-boundaries-freeze`; no GitHub remote yet, so no PR number.
Files changed: `decisions/0016-public-api-boundaries-freeze.md` (new ADR), `decisions/index.md`, `engineering/package-api.md` (symbol ownership map + A/B/C classification), `tools/architecture-check/{check.ts,boundaries.json}`, root `package.json` (`architecture:check` script), `.github/workflows/ci.yml`, `evidence/gh-005/verification-transcript.md`, `log.md`, `issues/m0/index.md`, `README.md`.
Commands executed: `bun run docs:validate` (exit 0, 207 documents), `bun run architecture:check` (exit 0, 7 package rules), adversarial probe with three injected violations (dialect import, external dependency, raw `HX-Request` string — all caught, exit 1, then restored), plus the full battery (format/lint/typecheck/`bun test` 14/14/build/docs:check/issues:graph — exit 0).
Evidence: `evidence/gh-005/verification-transcript.md`; freeze in ADR-0016.
Contract/API changes: frozen principles only — package map, dependency direction, handler contract, JSX boundary, HTMX subset + escape hatch, forbidden dependencies, non-goals, pre-1.0 change classification. Exact signatures deliberately deferred per issue scope.
Security/performance impact: raw-htmx-string confinement outside `@bundar/htmx` is now machine-enforced; external-dependency injection into framework packages is machine-rejected.
Remaining risks: string-level scanning is heuristic until the GH-006 harness layers stricter checks; examples are not yet covered by the manifest (empty until M5).
Documentation updated: ADR-0016, `engineering/package-api.md`, `decisions/index.md`, `log.md`, README status.
Newly unblocked issues: GH-006, GH-007, GH-008.
