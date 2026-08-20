---
type: GitHub Issue Specification
title: GH-040 — Define the HTMX dialect adapter interface
description: All upstream version differences pass through one small, capability-aware adapter interface.
tags:
- github-issue
- m3
- htmx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-040
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-039
  blocks:
  - GH-041
  - GH-042
  - GH-046
  - GH-047
---

# GH-040 — Define the HTMX dialect adapter interface

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

All upstream version differences pass through one small, capability-aware adapter interface.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define request decoding, response directive encoding, event normalization, asset descriptor, capability set, and compatibility diagnostics.
- Keep interface data-oriented and independently testable.
- Define adapter identity, exact supported version range, maturity, and feature flags.
- Document extension points without exposing private implementation hooks.

## Out of scope

- A generic browser framework adapter API.

## Acceptance criteria

- [ ] A synthetic third dialect can be implemented in a test without changing core types.
- [ ] Interface does not contain raw v2-only or v4-only field names unless inside dialect-owned metadata.
- [ ] Capabilities distinguish unsupported, emulated, and native behavior.
- [ ] Adapters are immutable and safe to reuse across requests.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/dialect-contract.test.ts
bun run test:types
bun run docs:validate
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-039 — Create @bundar/htmx and the version-neutral protocol model](gh-039-create-bundar-htmx-and-the-version-neutral-protocol-model.md)

## Blocks

- [GH-041 — Implement normalized HTMX request metadata](gh-041-implement-normalized-htmx-request-metadata.md)
- [GH-042 — Implement normalized HTMX response directives](gh-042-implement-normalized-htmx-response-directives.md)
- [GH-046 — Normalize HTMX lifecycle and application events](gh-046-normalize-htmx-lifecycle-and-application-events.md)
- [GH-047 — Add inheritance and extension compatibility helpers](gh-047-add-inheritance-and-extension-compatibility-helpers.md)


## Suggested files

- `packages/htmx/src/dialect.ts`
- `packages/htmx/src/capabilities.ts`
- `packages/htmx/test/dialect-contract.test.ts`

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
Stable ID: GH-040
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
