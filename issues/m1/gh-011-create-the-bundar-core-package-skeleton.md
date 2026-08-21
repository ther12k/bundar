---
type: GitHub Issue Specification
title: GH-011 — Create the @bundar/core package skeleton
description: The core package builds, tests, and exports only an intentionally small placeholder surface.
tags:
- github-issue
- m1
- core
- feature
- p0
- s
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-011
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:core
  - priority:p0
  - size:s
  priority: p0
  size: s
  depends_on:
  - GH-010
  blocks:
  - GH-012
  - GH-026
---

# GH-011 — Create the @bundar/core package skeleton

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:core`, `priority:p0`, `size:s`  
**Priority:** `P0`  
**Size:** `S`

## Outcome

The core package builds, tests, and exports only an intentionally small placeholder surface.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create source, test, package export, type declaration, and build layout.
- Add runtime and type entry points with explicit Bun engine requirement.
- Add package-local scripts and API extraction/reporting hook.

## Out of scope

- App builder, routing, context, and middleware behavior.

## Acceptance criteria

- [x] Package can be imported from a workspace consumer.
- [x] Published files are allow-listed.
- [x] Runtime dependency count is zero.
- [x] No route behavior is prematurely implemented.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run --filter @bundar/core typecheck
bun test packages/core
bun run pack:inspect @bundar/core
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-010 — Run and record the M0 contract-freeze gate](../m0/gh-010-run-and-record-the-m0-contract-freeze-gate.md)

## Blocks

- [GH-012 — Define route descriptor and handler types](gh-012-define-route-descriptor-and-handler-types.md)
- [GH-026 — Create the @bundar/jsx package and JSX type surface](../m2/gh-026-create-the-bundar-jsx-package-and-jsx-type-surface.md)


## Suggested files

- `packages/core/package.json`
- `packages/core/src/index.ts`
- `packages/core/tsconfig.json`
- `packages/core/test/**`

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
Stable ID: GH-011
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

Stable ID: GH-011
Commit / PR: branch `gh-011-core-package-skeleton`; implementation and evidence commits are recorded in the repository history and on GitHub issue #11.
Files changed: `packages/core/package.json` (engines, exports/types, files allow-list, typecheck/test scripts), `packages/core/tsconfig.json` (includes `test/**`), `packages/core/test/import.test.ts` (new), `packages/core/README.md`, `scripts/pack-inspect.ts` (new), root `package.json` (`pack:inspect`), `evidence/gh-011/verification-transcript.md` (new), `issues/m1/index.md`, `log.md`.
Commands executed: `bun run --filter @bundar/core typecheck` (exit 0), `bun test packages/core` (4 pass / 0 fail), `bun run pack:inspect @bundar/core` (exit 0; 3 packed files, 0 runtime dependencies), plus four adversarial `pack:inspect` probes (unknown selector, stale allow-list entry, injected runtime dependency — all exit 1 with the intended message and no leaked tarball) and the full repository battery: format, lint, typecheck, docs validate/links/graph/check, architecture check, `bun test` 35/35, build, frozen install — all exit 0.
Evidence: `evidence/gh-011/verification-transcript.md`.
Contract/API changes: package manifest only. `src/index.ts` remains an intentional empty placeholder; no routing, app, context, middleware, or response symbols are exported (asserted by test). The planned `pack:inspect` placeholder is now a real fail-closed tool reusable for later packages.
Security/performance impact: supply-chain surface unchanged — zero runtime dependencies enforced by four independent checks (package test, skeleton test, architecture check, `pack:inspect` ADR-0011 rule). No runtime code was added, so there is no performance surface.
Remaining risks: publish-time layout (`dist`, export-map variants) deferred to GH-084–GH-086; pax header path overrides are not interpreted by the tar parser (not emitted for current path lengths); zero-dependency enforcement in `pack:inspect` covers exactly `@bundar/core` and `@bundar/jsx` per ADR-0011.
Documentation updated: `packages/core/README.md`, `evidence/gh-011/verification-transcript.md`, `issues/m1/index.md`, `log.md`.
Newly unblocked issues: GH-012 (route descriptor and handler types) and GH-026 (`@bundar/jsx` package skeleton).
