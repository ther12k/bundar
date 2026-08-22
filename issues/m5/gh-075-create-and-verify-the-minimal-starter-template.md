---
type: GitHub Issue Specification
title: GH-075 — Create and verify the minimal starter template
description: The default template demonstrates Bundar’s smallest coherent application rather than hiding complexity in generated magic.
tags:
- github-issue
- m5
- docs
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-075
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:feature
  - area:docs
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-071
  - GH-073
  - GH-074
  blocks:
  - GH-076
  - GH-077
---

# GH-075 — Create and verify the minimal starter template

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:feature`, `area:docs`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

The default template demonstrates Bundar’s smallest coherent application rather than hiding complexity in generated magic.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create one layout, home route, health response, progressively enhanced form, validation, error region, local HTMX asset, and tests.
- Use typed route URLs and secure defaults.
- Keep comments focused and source count small.
- Document exact generated file purposes.

## Out of scope

- Database and authentication implementation.

## Acceptance criteria

- [x] Template passes install/typecheck/test/build/start in isolation.
- [x] Core page and form work without JavaScript.
- [x] Switching adapter changes only bootstrap/configuration.
- [x] No demo credentials, random production-looking data, or external CDN dependency exists.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:template -- minimal-htmx2
bun run test:template -- minimal-htmx4
bun run htmx:source-diff templates/minimal
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-071 — Implement create-bundar scaffolding](gh-071-implement-create-bundar-scaffolding.md)
- [GH-073 — Generate route manifests and typed URL builders](gh-073-generate-route-manifests-and-typed-url-builders.md)
- [GH-074 — Implement the in-process test client and request helpers](gh-074-implement-the-in-process-test-client-and-request-helpers.md)

## Blocks

- [GH-076 — Build the Todo reference application](gh-076-build-the-todo-reference-application.md)
- [GH-077 — Build the Admin CRUD reference application](gh-077-build-the-admin-crud-reference-application.md)


## Suggested files

- `templates/minimal/**`
- `docs/getting-started.md`

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
Stable ID: GH-075
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

Stable ID: GH-075
Commit / PR: merged `gh-075-starter-template` into `main` (merge commit recorded in `log.md`).
Files changed: `templates/minimal/**` (new canonical starter: dialect.ts, app.ts, layout.tsx, main.ts, routes.gen.ts generated, app.test.ts, README with exact file purposes, package/tsconfig), `tools/test-template.ts` (new) + `test:template` script, `tools/source-diff.ts` (guards templates/minimal), workspaces + lockfile for the template member, `evidence/gh-075/verification-transcript.md`.
Commands executed: `test:template -- minimal-htmx2` and `-- minimal-htmx4` both exit 0 (install→typecheck→test 5/5→build→START with six live HTTP assertions; htmx4 variant delta enforced = src/dialect.ts only; lockfile restored); `htmx:source-diff` exit 0 (7 files); routes:check up-to-date; full suite 761/761; typecheck; lint; format; architecture; api:check; build; docs — all exit 0.
Evidence: `evidence/gh-075/verification-transcript.md`.
Contract/API changes: none to framework packages (api:check match); new repo-level template + verification script.
Security/performance impact: none beyond the template's own secure defaults (app-owned ErrorBoundary, bounded parsing via runFormAction, local pinned htmx asset, no CDN/credentials/fake data).
Remaining risks: pre-npm workspace:* deps (M6 publication tooling will finalize external install); documented in the transcript and template README.
Documentation updated: `templates/minimal/README.md` (exact file purposes), this closure record, `issues/m5/index.md`, `log.md`.
Newly unblocked issues: GH-076 (Todo reference app), GH-077 (Admin CRUD reference app).
