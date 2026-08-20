---
type: GitHub Issue Specification
title: GH-036 — Close JSX conformance, security, and snapshot coverage
description: Renderer behavior is covered across HTML semantics, hostile inputs, type consumption, and representative component trees.
tags:
- github-issue
- m2
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-036
  milestone: M2 — Server JSX Runtime
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-031
  - GH-033
  - GH-035
  blocks:
  - GH-037
  - GH-038
---

# GH-036 — Close JSX conformance, security, and snapshot coverage

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Renderer behavior is covered across HTML semantics, hostile inputs, type consumption, and representative component trees.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Build conformance fixtures for elements, attributes, text, documents, components, async behavior, and raw boundaries.
- Add snapshot review policy that prevents blind updates.
- Add external consumer compile tests and fuzz/property tests.
- Compare selected output against browser parsing expectations.

## Out of scope

- Claiming standards conformance beyond the tested subset.

## Acceptance criteria

- [ ] Every public renderer primitive has positive and negative tests.
- [ ] Security payload corpus passes with expected escaping.
- [ ] Snapshots are deterministic across supported platforms.
- [ ] Browser DOM interpretation matches intended structure for selected edge cases.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx
bun run test:consumer:jsx
bun run test:browser:jsx
bun run security:jsx
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-031 — Implement explicit raw HTML and trust-boundary controls](gh-031-implement-explicit-raw-html-and-trust-boundary-controls.md)
- [GH-033 — Implement renderToString and JSX Response integration](gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-035 — Add typed common HTMX attributes without runtime coupling](gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md)

## Blocks

- [GH-037 — Run the M2 JSX performance and memory gate](gh-037-run-the-m2-jsx-performance-and-memory-gate.md)
- [GH-038 — Run and record the M2 server-JSX gate](gh-038-run-and-record-the-m2-server-jsx-gate.md)


## Suggested files

- `packages/jsx/test/**`
- `tests/consumer/jsx/**`
- `tests/browser/jsx/**`

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
Stable ID: GH-036
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
