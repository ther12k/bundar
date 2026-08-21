---
type: GitHub Issue Specification
title: GH-057 — Implement bounded form and request-body parsing
description: Handlers can parse URL-encoded, multipart, text, and JSON bodies through explicit, bounded APIs with single-consumption semantics.
tags:
- github-issue
- m4
- forms
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-057
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:feature
  - area:forms
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-017
  blocks:
  - GH-058
  - GH-061
  - GH-064
  - GH-067
---

# GH-057 — Implement bounded form and request-body parsing

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:feature`, `area:forms`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Handlers can parse URL-encoded, multipart, text, and JSON bodies through explicit, bounded APIs with single-consumption semantics.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement lazy body APIs and content-type dispatch.
- Define size, field-count, file-count, nesting, and timeout limits with secure defaults.
- Track consumed body state and produce deterministic errors on repeated incompatible reads.
- Preserve repeated form keys and distinguish absent from empty values.

## Out of scope

- Schema validation and persistent file storage.

## Acceptance criteria

- [x] Oversized or excessive inputs fail before unbounded allocation.
- [x] Malformed media types produce controlled 4xx responses.
- [x] Repeated fields retain order and multiplicity.
- [x] Body parsing does not run on routes that do not request it.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/body/**
bun run security:body-limits
bun run bench -- form-parse
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-017 — Implement the request context contract](../m1/gh-017-implement-the-request-context-contract.md)

## Blocks

- [GH-058 — Implement the Standard Schema validation adapter](gh-058-implement-the-standard-schema-validation-adapter.md)
- [GH-061 — Implement CSRF primitives and form middleware](gh-061-implement-csrf-primitives-and-form-middleware.md)
- [GH-064 — Implement multipart upload policy and safe temporary-file handling](gh-064-implement-multipart-upload-policy-and-safe-temporary-file-handling.md)
- [GH-067 — Implement request budgets, timeouts, and abort propagation](gh-067-implement-request-budgets-timeouts-and-abort-propagation.md)


## Suggested files

- `packages/core/src/request/body.ts`
- `packages/core/src/request/form.ts`
- `packages/core/test/body/**`

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
Stable ID: GH-057
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
