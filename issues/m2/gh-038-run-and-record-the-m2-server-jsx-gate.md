---
type: GitHub Issue Specification
title: GH-038 — Run and record the M2 server-JSX gate
description: Maintainers accept the server-only JSX runtime for use by page, fragment, and action abstractions.
tags:
- github-issue
- m2
- release
- release
- p0
- s
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-038
  milestone: M2 — Server JSX Runtime
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:s
  priority: p0
  size: s
  depends_on:
  - GH-036
  - GH-037
  blocks:
  - GH-071
  - GH-079
---

# GH-038 — Run and record the M2 server-JSX gate

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:release`, `area:release`, `priority:p0`, `size:s`  
**Priority:** `P0`  
**Size:** `S`

## Outcome

Maintainers accept the server-only JSX runtime for use by page, fragment, and action abstractions.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Run package, security, browser parsing, API, architecture, and performance gates.
- Review raw HTML call-site policy and streaming limitations.
- Record exact commit and approved public surface.
- Authorize dependent templates and HTMX rendering work.

## Out of scope

- HTMX protocol compatibility claims.

## Acceptance criteria

- [ ] No React/hydration dependency or browser lifecycle exists.
- [ ] Escaping/security suites pass.
- [ ] Core/JSX dependency direction remains valid.
- [ ] Performance evidence and known limitations are recorded.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run ci:m2
bun run architecture:check
bun run pack:inspect @bundar/jsx
bun run api:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-036 — Close JSX conformance, security, and snapshot coverage](gh-036-close-jsx-conformance-security-and-snapshot-coverage.md)
- [GH-037 — Run the M2 JSX performance and memory gate](gh-037-run-the-m2-jsx-performance-and-memory-gate.md)

## Blocks

- [GH-071 — Implement create-bundar scaffolding](../m5/gh-071-implement-create-bundar-scaffolding.md)
- [GH-079 — Publish generated API reference and compatibility documentation source](../m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md)


## Suggested files

- `docs/okf/delivery/gates/m2.md`
- `docs/okf/log.md`

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
Stable ID: GH-038
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
