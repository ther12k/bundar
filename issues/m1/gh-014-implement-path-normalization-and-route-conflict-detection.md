---
type: GitHub Issue Specification
title: GH-014 — Implement path normalization and route-conflict detection
description: Invalid, ambiguous, or duplicate route declarations fail before the server starts.
tags:
- github-issue
- m1
- routing
- feature
- p0
- m
status: complete
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-014
  milestone: M1 — Bun-native HTTP Core
  labels:
  - type:feature
  - area:routing
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-012
  blocks:
  - GH-015
---

# GH-014 — Implement path normalization and route-conflict detection

**Milestone:** M1 — Bun-native HTTP Core  
**Labels:** `type:feature`, `area:routing`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Invalid, ambiguous, or duplicate route declarations fail before the server starts.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Normalize prefixes, slash joining, root routes, and supported wildcard syntax.
- Detect duplicate path/method pairs and incompatible static/handler entries.
- Produce diagnostics containing both declaration sites where available.
- Document Bun-native precedence that Bundar intentionally preserves.

## Out of scope

- Inventing route patterns Bun cannot natively represent.

## Acceptance criteria

- [x] Duplicate registrations fail deterministically.
- [x] Equivalent normalized paths cannot bypass collision detection.
- [x] Valid method-specific routes share a path.
- [x] Diagnostics do not expose absolute user paths in normal production output.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test ./packages/core/test/routing/conflicts.test.ts
bun test ./packages/core/test/routing/paths.test.ts
```

Tooling decision: Bun 1.4 requires the explicit `./` path form for these file-specific tests; the equivalent commands above preserve the planned test targets without name-filter ambiguity.

## Dependencies

- [GH-012 — Define route descriptor and handler types](gh-012-define-route-descriptor-and-handler-types.md)

## Blocks

- [GH-015 — Compile Bundar routes to Bun.serve native route tables](gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)

## Suggested files

- `packages/core/src/routing/path.ts`
- `packages/core/src/routing/conflicts.ts`
- `packages/core/test/routing/**`

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
Stable ID: GH-014
Commit / PR: fb0c9d4 (implementation branch; merge commit recorded after verification)
Files changed: packages/core/src/routing/path.ts, packages/core/src/routing/conflicts.ts, packages/core/src/index.ts, packages/core/test/routing/paths.test.ts, packages/core/test/routing/conflicts.test.ts, packages/core/test/import.test.ts, packages/core/README.md, engineering/package-api.md, evidence/gh-014/verification-transcript.md, issues/m1/index.md, log.md
Commands executed: frozen install; focused path/conflict tests; package/root typecheck; lint; architecture check; package inspection; full core tests; build — all exit 0
Evidence: evidence/gh-014/verification-transcript.md
Contract/API changes: runtime path normalization and deterministic normalized path/method conflict diagnostics; only Bun-native-style parameters and bare final wildcards accepted; no dispatch or native compilation
Security/performance impact: diagnostics redact absolute path-like source labels; no network/body/runtime dependency changes
Remaining risks: native route matching/precedence and wildcard runtime values remain GH-015 scope
Documentation updated: packages/core/README.md, engineering/package-api.md, issues/m1/index.md, log.md
Newly unblocked issues: GH-015 once GH-013 is merged (GH-013 is already complete on main)
```
