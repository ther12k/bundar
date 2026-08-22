---
type: GitHub Issue Specification
title: GH-047 — Add inheritance and extension compatibility helpers
description: Version-sensitive inheritance and extension usage is explicit, testable, and detectable during migration.
tags:
- github-issue
- m3
- htmx
- feature
- p1
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-047
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p1
  - size:l
  priority: p1
  size: l
  depends_on:
  - GH-035
  - GH-040
  - GH-043
  - GH-044
  blocks:
  - GH-078
---

# GH-047 — Add inheritance and extension compatibility helpers

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p1`, `size:l`  
**Priority:** `P1`  
**Size:** `L`

## Outcome

Version-sensitive inheritance and extension usage is explicit, testable, and detectable during migration.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Model stable intent for inherited attributes where feasible.
- Provide v2 and v4 encoding/diagnostics for implicit versus explicit inheritance.
- Define extension registration capability and raw extension escape hatch.
- Add fixtures for official htmx-2-compat behavior as a temporary migration reference.

## Out of scope

- Guaranteeing third-party extension compatibility.

## Acceptance criteria

- [x] Bundar does not assume implicit inheritance in neutral components.
- [x] The v2 adapter can preserve v2 behavior while the v4 adapter emits explicit configuration where approved.
- [x] Unsupported extension patterns produce migration diagnostics.
- [x] Compatibility extension use is optional and visible, never silently injected.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/inheritance/**
bun test packages/htmx/test/extensions/**
bun run test:browser:dual -- inheritance
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-035 — Add typed common HTMX attributes without runtime coupling](../m2/gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md)
- [GH-040 — Define the HTMX dialect adapter interface](gh-040-define-the-htmx-dialect-adapter-interface.md)
- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)

## Blocks

- [GH-078 — Implement the HTMX 2-to-4 audit and migration linter](../m5/gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md)


## Suggested files

- `packages/htmx/src/inheritance.ts`
- `packages/htmx/src/extensions.ts`
- `packages/htmx/test/inheritance/**`

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
Stable ID: GH-047
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

Stable ID: GH-047
Commit / PR: merged `gh-047-inheritance` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/htmx/src/inheritance.ts` (new), `packages/htmx/src/extensions.ts` (new), `packages/htmx/test/inheritance/inheritance.test.ts` (new, 6 tests), `packages/htmx/test/extensions/extensions.test.ts` (new, 6 tests), browser lane `inheritance-disinherit` scenario in both lanes, `packages/htmx/README.md`, `evidence/gh-047/verification-transcript.md` (new).
Commands executed: inheritance + extensions 12/12; both browser lanes; htmx + root typecheck; lint; format; full repo 624/624; architecture (73 files); pack:inspect @bundar/htmx; build; docs validate/links — all exit 0.
Evidence: `evidence/gh-047/verification-transcript.md`.
Contract/API changes: new exports in @bundar/htmx — `formatDisinherit`, `diagnoseInheritance`, `HTMX2_INHERITED_ATTRIBUTES`, `InheritancePolicyError`, `formatExtensionAttribute`, `diagnoseExtension`, `rawExtension`, `HTMX_2_COMPAT_EXTENSION`, `OFFICIAL_EXTENSIONS`, `ExtensionPolicyError`, `InheritanceDiagnostic`, `ExtensionDiagnostic`, `HtmxExtensionDescriptor`, `RawExtension` types. No existing API changed.
Security/performance impact: explicit inheritance prevents silent reliance on implicit upstream defaults; extension diagnostics provide early migration warnings for deprecated extensions (e.g. json-enc in v4); raw extension names are cleanly audited.
Remaining risks: third-party extension compatibility unverified by design.
Documentation updated: htmx README, this closure record, `issues/m3/index.md`, `log.md`.
Newly unblocked issues: GH-078 (HTMX 2-to-4 migration linter).
