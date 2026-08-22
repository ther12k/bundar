---
type: GitHub Issue Specification
title: GH-080 — Write getting-started, architecture, security, and HTMX migration guides
description: A developer can adopt Bundar, understand its boundaries, build progressive workflows, and evaluate an HTMX 4 switch without reading framework internals.
tags:
- github-issue
- m5
- docs
- docs
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-080
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:docs
  - area:docs
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-076
  - GH-077
  - GH-078
  - GH-079
  blocks:
  - GH-081
---

# GH-080 — Write getting-started, architecture, security, and HTMX migration guides

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:docs`, `area:docs`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

A developer can adopt Bundar, understand its boundaries, build progressive workflows, and evaluate an HTMX 4 switch without reading framework internals.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Write installation/first app, routing, JSX, layouts/fragments, forms, sessions/security, testing, deployment, troubleshooting, and migration guides.
- Use reference apps as executable source links.
- Include comparison guidance for raw Bun, Hono, Elysia, and when Bundar is not appropriate.
- Document HTMX 4 switch procedure and rollback.

## Out of scope

- Marketing site design.

## Acceptance criteria

- [x] All commands/snippets are tested in CI.
- [x] Guide does not imply beta is GA.
- [x] No-JS fallback and security are shown in the main path, not an appendix.
- [x] Migration guide requires audit and dual-lane tests before changing defaults.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run docs:check
bun run docs:snippets
bun run test:guides
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-076 — Build the Todo reference application](gh-076-build-the-todo-reference-application.md)
- [GH-077 — Build the Admin CRUD reference application](gh-077-build-the-admin-crud-reference-application.md)
- [GH-078 — Implement the HTMX 2-to-4 audit and migration linter](gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md)
- [GH-079 — Publish generated API reference and compatibility documentation source](gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md)

## Blocks

- [GH-081 — Run the M5 developer-experience usability gate](gh-081-run-the-m5-developer-experience-usability-gate.md)


## Suggested files

- `docs/getting-started.md`
- `docs/guides/**`
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
Stable ID: GH-080
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

Stable ID: GH-080
Commit / PR: merged `gh-080-guides` into `main` (merge commit recorded in `log.md`).
Files changed: `docs/getting-started.md` (new), `docs/guides/{architecture,security,htmx-migration}.md` (new), `docs/snippets/guides/*.ts` (new, 5 runnable modules), `tests/docs/{guides.test.ts,snippets-guide.test.ts}` (new, 15 tests) + `test:guides` script, `evidence/gh-080/verification-transcript.md`.
Commands executed: `test:guides` 10/10 (+ snippet modules execute); docs:check/docs:snippets/api:check/docs:validate/docs:links exit 0; typecheck; lint; format; architecture; build; full suite 824/824 — all exit 0.
Evidence: `evidence/gh-080/verification-transcript.md`.
Contract/API changes: none (documentation + verification tooling).
Security/performance impact: none directly; the security guide documents the tested composition contract and metadata-never-trusted authorization as the main path.
Remaining risks: comparison guidance avoids benchmark claims (M6 owns budgets); guide↔reference links are drift-guarded by GH-079 generation.
Documentation updated: the four new guides + getting-started, this closure record, `issues/m5/index.md`, `log.md`.
Newly unblocked issues: GH-081 (M5 usability gate).
