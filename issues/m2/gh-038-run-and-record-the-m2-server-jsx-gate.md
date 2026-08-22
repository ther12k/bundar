---
type: GitHub Issue Specification
title: GH-038 — Run and record the M2 server-JSX gate
description: Maintainers accept the server-only JSX runtime for use by page, fragment, and action abstractions.
tags:
- github-issue
- m2
- release
- release
- p0
- s
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-038
  milestone: M2 — Server JSX Runtime
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:s
  priority: p0
  size: s
  depends_on:
  - GH-036
  - GH-037
  blocks:
  - GH-071
  - GH-079
---

# GH-038 — Run and record the M2 server-JSX gate

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:s`  
**Priority:** `P0`  
**Size:** `S`

## Outcome

Maintainers accept the server-only JSX runtime for use by page, fragment, and action abstractions.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run package, security, browser parsing, API, architecture, and performance gates.
- Review raw HTML call-site policy and streaming limitations.
- Record exact commit and approved public surface.
- Authorize dependent templates and HTMX rendering work.

## Out of scope

- HTMX protocol compatibility claims.

## Acceptance criteria

- [x] No React/hydration dependency or browser lifecycle exists.
- [x] Escaping/security suites pass.
- [x] Core/JSX dependency direction remains valid.
- [x] Performance evidence and known limitations are recorded.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run ci:m2
bun run architecture:check
bun run pack:inspect @bundar/jsx
bun run api:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-036 — Close JSX conformance, security, and snapshot coverage](gh-036-close-jsx-conformance-security-and-snapshot-coverage.md)
- [GH-037 — Run the M2 JSX performance and memory gate](gh-037-run-the-m2-jsx-performance-and-memory-gate.md)

## Blocks

- [GH-071 — Implement create-bundar scaffolding](../m5/gh-071-implement-create-bundar-scaffolding.md)
- [GH-079 — Publish generated API reference and compatibility documentation source](../m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md)


## Suggested files

- `docs/okf/delivery/gates/m2.md`
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
Stable ID: GH-038
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

Stable ID: GH-038
Commit / PR: merged `gh-038-m2-gate` into `main` (merge commit recorded in `log.md`).
Files changed: `scripts/m2-gate.ts` (new) + `ci:m2` script, `delivery/gates/m2.md` (new) + delivery index, `evidence/gh-038/verification-transcript.md` (new), this closure record, `issues/m2/index.md`, `log.md`.
Commands executed: `bun run ci:m2` — all 37 ordered fail-closed steps exit 0 (strict superset of ci:m1: schema consumer, five security audits, browser DOM lane, committed m2 artifact verification); standalone `architecture:check`, `pack:inspect @bundar/jsx`, `api:check` — exit 0; docs validate/links after the record — exit 0.
Evidence: `evidence/gh-038/verification-transcript.md`; gate record `delivery/gates/m2.md`; performance half `delivery/gates/m2-performance.md`; `artifacts/bench/m2.json`; per-issue transcripts GH-026–GH-037.
Contract/API changes: none — recording gate only; the approved M2 public surface is enumerated in the gate record (jsx streaming + typed htmx attributes + forms helpers; core unchanged since M1 except M4-era additions already merged and snapshot-checked).
Security/performance impact: raw-HTML policy reviewed (branded raw() only, call sites enumerable via audit); renderer parity absolute across sync/async/streaming; performance baseline and budgets recorded with the documented ~3× streaming trade-off; dependency direction machine-enforced (8 rules).
Remaining risks: single-machine baselines; streaming overhead and cancellation platform limit (documented); exotic tags loosely typed; open-string hx grammar validation deferred to M3 adapters.
Documentation updated: gate record + index, this closure record, `issues/m2/index.md`, `log.md`.
Newly unblocked issues: GH-071, GH-079. **The M2 milestone is closed.**
