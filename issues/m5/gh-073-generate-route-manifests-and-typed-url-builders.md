---
type: GitHub Issue Specification
title: GH-073 — Generate route manifests and typed URL builders
description: Applications use generated, parameter-safe URLs in `href`, form actions, and `hx-*` attributes without introducing an RPC client contract.
tags:
- github-issue
- m5
- cli
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-073
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:feature
  - area:cli
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-012
  - GH-015
  - GH-070
  blocks:
  - GH-075
  - GH-079
---

# GH-073 — Generate route manifests and typed URL builders

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:feature`, `area:cli`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Applications use generated, parameter-safe URLs in `href`, form actions, and `hx-*` attributes without introducing an RPC client contract.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define stable route naming/metadata requirements.
- Generate a deterministic manifest and typed URL helper module.
- Support path params, repeated query values, URL encoding, and optional query objects.
- Add stale-generation detection and CI check mode.

## Out of scope

- Typed JSON RPC or OpenAPI generation in v0.1.

## Acceptance criteria

- [x] Missing required params fail typecheck.
- [x] Generated URLs are standards-compliant and match server routes.
- [x] Changing a named route causes a deterministic generated diff.
- [x] Generator never executes application handlers or untrusted startup side effects.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/cli/test/routes/**
bun run routes:generate
bun run routes:check
bun run test:consumer:routes
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-012 — Define route descriptor and handler types](../m1/gh-012-define-route-descriptor-and-handler-types.md)
- [GH-015 — Compile Bundar routes to Bun.serve native route tables](../m1/gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md)
- [GH-070 — Create the Bundar CLI package and command framework](gh-070-create-the-bundar-cli-package-and-command-framework.md)

## Blocks

- [GH-075 — Create and verify the minimal starter template](gh-075-create-and-verify-the-minimal-starter-template.md)
- [GH-079 — Publish generated API reference and compatibility documentation source](gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md)


## Suggested files

- `packages/cli/src/commands/routes.ts`
- `packages/core/src/manifest.ts`
- `tests/consumer/routes/**`

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
Stable ID: GH-073
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
