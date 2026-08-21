---
type: GitHub Issue Specification
title: GH-012 — Define route descriptor and handler types
description: Route definitions have a minimal typed model for methods, paths, handlers, static responses, metadata, and compile-time parameter inference.
tags:
- github-issue
- m1
- routing
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-012
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:routing
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-011
  blocks:
  - GH-013
  - GH-014
  - GH-073
---

# GH-012 — Define route descriptor and handler types

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:routing`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Route definitions have a minimal typed model for methods, paths, handlers, static responses, metadata, and compile-time parameter inference.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define supported HTTP methods and route descriptor unions.
- Model `Response` static entries separately from callable handlers.
- Infer literal path parameters without a runtime schema requirement.
- Define metadata extension points that do not affect dispatch.

## Out of scope

- Runtime route compilation.
- Automatic body parsing.

## Acceptance criteria

- [x] Literal `/users/:id` exposes `id` as a string parameter.
- [x] Wildcard and optional/unsupported patterns have documented behavior.
- [x] A handler must return `Response | Promise<Response>`.
- [x] Type tests reject invalid methods and duplicate method declarations in one descriptor.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/types/route-descriptor.test-d.ts
bun run typecheck
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-011 — Create the @bundar/core package skeleton](gh-011-create-the-bundar-core-package-skeleton.md)

## Blocks

- [GH-013 — Implement App builder, grouping, and module mounting](gh-013-implement-app-builder-grouping-and-module-mounting.md)
- [GH-014 — Implement path normalization and route-conflict detection](gh-014-implement-path-normalization-and-route-conflict-detection.md)
- [GH-073 — Generate route manifests and typed URL builders](../m5/gh-073-generate-route-manifests-and-typed-url-builders.md)


## Suggested files

- `packages/core/src/routing/types.ts`
- `packages/core/test/types/**`
- `docs/okf/engineering/package-api.md`

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
Stable ID: GH-012
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

Stable ID: GH-012
Commit / PR: branch `gh-012-route-descriptor-types`; implementation and evidence commits recorded in repository history and on GitHub issue #12.
Files changed: `packages/core/src/routing/types.ts` (new), `packages/core/src/index.ts` (re-exports), `packages/core/test/types/{route-descriptor.test-d.ts,route-descriptor.test.ts,type-utils.ts}` (new), `packages/core/test/import.test.ts` (runtime surface now `["HTTP_METHODS","isHttpMethod"]`), `packages/core/README.md`, root `tsconfig.json` (includes `packages/*/test/**/*.ts` so root typecheck enforces type tests), `evidence/gh-012/verification-transcript.md` (new), `issues/m1/index.md`, `log.md`.
Commands executed: `bun test ./packages/core/test/types/route-descriptor.test-d.ts` (9 pass / 0 fail) — documented tooling decision: Bun discovery does not match `.test-d.ts`, so the planned file runs via explicit `./` path plus a `.test.ts` wrapper for normal runs; `bun run typecheck` (root and package, exit 0); adversarial corrupted-expectation probe (typecheck exit 2, restored to exit 0); full battery: format, lint, architecture (8 files), `pack:inspect @bundar/core` (4 packed files, 0 dependencies), `bun test` 44/44, build, frozen install, docs validate/links/graph/check — all exit 0.
Evidence: `evidence/gh-012/verification-transcript.md`.
Contract/API changes: first public type surface of `@bundar/core` — `HTTP_METHODS`, `isHttpMethod`, `HttpMethod`, `RouteParams`, `ValidateRoutePath` (+ `RoutePathError` literals), `RouteHandler`, `RouteMethods` (+ `DuplicateMethodError`), `RouteMetadata`, `Simplify`, `HandlerRoute`, `StaticRoute`, `RouteDescriptor`. Handler return contract is `Response | Promise<Response>` only (ADR-0016). No routing runtime added.
Security/performance impact: none — no dispatch, path matching, or body parsing exists yet; zero runtime dependencies preserved.
Remaining risks: stray `:` in static segments and identifier-charset strictness delegated to GH-014 runtime validation; wildcard request-value exposure unmodeled until GH-015 records real `Bun.serve` behavior; duplicate-method type check covers const tuples only (dynamic arrays are GH-014 scope).
Documentation updated: `packages/core/README.md`, `engineering/package-api.md` (GH-012 landed-surface note), `issues/m1/index.md`, `log.md`.
Newly unblocked issues: GH-013 (app builder, grouping, mounting) and GH-014 (path normalization and conflict detection).
