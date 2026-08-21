---
type: GitHub Issue Specification
title: GH-013 — Implement App builder, grouping, and module mounting
description: Developers can register routes through a readable Hono-like API while Bundar retains an immutable compile model.
tags:
- github-issue
- m1
- core
- feature
- p0
- m
status: complete
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-013
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:core
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-012
  blocks:
  - GH-015
---

# GH-013 — Implement App builder, grouping, and module mounting

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:core`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Developers can register routes through a readable Hono-like API while Bundar retains an immutable compile model.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement `new App()`, HTTP verb methods, `route`, `group`, and `mount` or approved equivalents.
- Preserve registration order only where contractually relevant.
- Return predictable builder types without unbounded generic growth.
- Expose an inspectable route manifest before compilation.

## Out of scope

- Calling `Bun.serve`.
- Middleware execution.

## Acceptance criteria

- [x] Grouped prefixes normalize correctly.
- [x] Mounted modules do not mutate the source module.
- [x] Builder calls produce deterministic manifests.
- [x] Typecheck performance fixture remains within the documented budget.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test ./packages/core/test/app-builder.test.ts
bun run test:types
bun run typecheck:perf
```

Tooling decision: Bun 1.4 requires the explicit `./` path form for the focused test; `test:types` and `typecheck:perf` are now explicit workspace scripts that preserve the planned checks.

## Dependencies

- [GH-012 — Define route descriptor and handler types](gh-012-define-route-descriptor-and-handler-types.md)

## Blocks

- [GH-015 — Compile Bundar routes to Bun.serve native route tables](gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)

## Suggested files

- `packages/core/src/app.ts`
- `packages/core/src/module.ts`
- `packages/core/test/app-builder.test.ts`

## Evidence required for closure

- Source commit and pull request.
- Exact Bun, TypeScript, operating-system, browser, Bundar-package, and relevant HTMX versions.
- Exact commands with exit status and summarized output.
- Test, benchmark, trace, screenshot, API report, package, or security artifacts required by the acceptance criteria.
- Documentation and compatibility changes.
- Residual risks, deviations, and newly unblocked stable IDs.

## Implementation notes

- Follow the master agent prompt and stop on contradictory evidence rather than weakening this issue.

## Closure report

```markdown
Stable ID: GH-013
Commit / PR: fb09408 implementation; c962053 merge to main
Files changed: packages/core/src/app.ts, packages/core/src/module.ts, packages/core/src/index.ts, packages/core/test/app-builder.test.ts, packages/core/test/import.test.ts, packages/core/README.md, scripts/test-types.ts, scripts/typecheck-perf.ts, package.json, engineering/package-api.md, evidence/gh-013/verification-transcript.md, issues/m1/index.md, log.md
Commands executed: bun install --frozen-lockfile; bun test ./packages/core/test/app-builder.test.ts (4 pass); bun run test:types (9 pass); bun run typecheck:perf (861ms/10000ms); package/root typecheck; bun test ./packages/core (17 pass); lint; architecture check; pack inspection; build; format/docs checks — all exit 0
Evidence: evidence/gh-013/verification-transcript.md
Contract/API changes: App verb helpers, descriptor registration, grouped prefixes, immutable module mounting, and defensive deterministic RouteManifest snapshots; no Bun.serve call
Security/performance impact: no runtime dependencies or network behavior; typecheck budget measured and passed
Remaining risks: runtime path validation/conflicts are GH-014; native compilation and wildcard runtime behavior are GH-015
Documentation updated: packages/core/README.md, engineering/package-api.md, issues/m1/index.md, log.md
Newly unblocked issues: GH-015 after GH-014 merge
```
