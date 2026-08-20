---
type: GitHub Issue Specification
title: GH-032 — Implement document, doctype, head, and void-element helpers
description: Complete HTML documents render with valid doctype, document structure, metadata, and void-element handling.
tags:
- github-issue
- m2
- jsx
- feature
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-032
  milestone: M2 — Server JSX Runtime
  labels:
  - type:feature
  - area:jsx
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-028
  - GH-029
  blocks:
  - GH-033
  - GH-066
---

# GH-032 — Implement document, doctype, head, and void-element helpers

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Complete HTML documents render with valid doctype, document structure, metadata, and void-element handling.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Add explicit document/doctype support.
- Define void and raw-text element serialization.
- Provide minimal head/title/meta helpers without becoming a head-management framework.
- Handle charset and document language defaults through explicit layout options.

## Out of scope

- Client-side head reconciliation and SEO plugin ecosystem.

## Acceptance criteria

- [ ] Document output begins with the approved doctype.
- [ ] Void elements never receive invalid closing tags.
- [ ] Script/style/raw-text handling follows documented escaping boundaries.
- [ ] Nested or duplicate document roots fail clearly.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/document/**
bun run test:html-validate
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-028 — Implement HTML attributes, class, style, and boolean serialization](gh-028-implement-html-attributes-class-style-and-boolean-serialization.md)
- [GH-029 — Implement fragments, arrays, iterables, and functional components](gh-029-implement-fragments-arrays-iterables-and-functional-components.md)

## Blocks

- [GH-033 — Implement renderToString and JSX Response integration](gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-066 — Implement security headers, CSP, and nonce propagation](../m4/gh-066-implement-security-headers-csp-and-nonce-propagation.md)


## Suggested files

- `packages/jsx/src/document.ts`
- `packages/jsx/src/render/elements.ts`
- `packages/jsx/test/document/**`

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
Stable ID: GH-032
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
