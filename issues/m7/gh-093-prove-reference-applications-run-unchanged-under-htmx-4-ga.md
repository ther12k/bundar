---
type: GitHub Issue Specification
title: GH-093 — Prove reference applications run unchanged under HTMX 4 GA
description: Minimal, Todo, Admin, and security workflow sources run against v4 GA by changing only adapter/asset configuration.
tags:
- github-issue
- m7
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-093
  milestone: M7 — HTMX 4 GA Adoption
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-076
  - GH-077
  - GH-092
  blocks:
  - GH-094
---

# GH-093 — Prove reference applications run unchanged under HTMX 4 GA

**Milestone:** M7 — HTMX 4 GA Adoption  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Minimal, Todo, Admin, and security workflow sources run against v4 GA by changing only adapter/asset configuration.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run source-diff guard and full app E2E suites under v2 and v4 GA.
- Inspect any generated output differences and classify them.
- Remove temporary beta-only workarounds where safe.
- Publish zero-application-change evidence or a blocking migration report.

## Out of scope

- Forcing unsupported raw application escape hatches to migrate automatically.

## Acceptance criteria

- [ ] No route handler, domain module, form component, or page component changes by dialect.
- [ ] Allowed bootstrap/config differences are enumerated and machine-checked.
- [ ] No-JS fallback remains green.
- [ ] A failure blocks default switch rather than being waived.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run htmx:source-diff
bun run test:examples:dual-ga
bun run conformance:app-compare
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-076 — Build the Todo reference application](../m5/gh-076-build-the-todo-reference-application.md)
- [GH-077 — Build the Admin CRUD reference application](../m5/gh-077-build-the-admin-crud-reference-application.md)
- [GH-092 — Run dual-version regression CI against HTMX 2 and HTMX 4 GA](gh-092-run-dual-version-regression-ci-against-htmx-2-and-htmx-4-ga.md)

## Blocks

- [GH-094 — Deprecate beta adapter paths and publish the GA migration report](gh-094-deprecate-beta-adapter-paths-and-publish-the-ga-migration-report.md)


## Suggested files

- `examples/**`
- `artifacts/conformance/apps-v4-ga.json`
- `docs/migrations/htmx-2-to-4.md`

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
Stable ID: GH-093
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
