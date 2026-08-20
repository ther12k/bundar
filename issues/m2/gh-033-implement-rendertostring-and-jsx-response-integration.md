---
type: GitHub Issue Specification
title: GH-033 — Implement renderToString and JSX Response integration
description: JSX trees can produce HTML strings and native Responses with correct content type, status, and headers.
tags:
- github-issue
- m2
- jsx
- feature
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-033
  milestone: M2 — Server JSX Runtime
  labels:
  - type:feature
  - area:jsx
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-021
  - GH-030
  - GH-032
  blocks:
  - GH-034
  - GH-036
  - GH-048
  - GH-050
  - GH-059
---

# GH-033 — Implement renderToString and JSX Response integration

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

JSX trees can produce HTML strings and native Responses with correct content type, status, and headers.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement sync/async `renderToString` contract and naming.
- Implement `html()` or equivalent Response helper integration without coupling JSX back to core internals improperly.
- Compose content type and user headers safely.
- Expose deterministic development diagnostics separately from production output.

## Out of scope

- Full-page/fragment negotiation.

## Acceptance criteria

- [ ] Synchronous trees can return synchronously where API design permits.
- [ ] Async trees resolve without output corruption.
- [ ] Content-Type includes approved UTF-8 semantics unless overridden safely.
- [ ] A consumer can use JSX renderer without importing core.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/render-to-string.test.ts
bun test packages/jsx/test/response.test.ts
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-021 — Implement explicit response helpers](../m1/gh-021-implement-explicit-response-helpers.md)
- [GH-030 — Implement async components and promised children](gh-030-implement-async-components-and-promised-children.md)
- [GH-032 — Implement document, doctype, head, and void-element helpers](gh-032-implement-document-doctype-head-and-void-element-helpers.md)

## Blocks

- [GH-034 — Implement renderToStream with backpressure and abort handling](gh-034-implement-rendertostream-with-backpressure-and-abort-handling.md)
- [GH-036 — Close JSX conformance, security, and snapshot coverage](gh-036-close-jsx-conformance-security-and-snapshot-coverage.md)
- [GH-048 — Implement full-page and fragment negotiation](../m3/gh-048-implement-full-page-and-fragment-negotiation.md)
- [GH-050 — Implement the progressive action response composer](../m3/gh-050-implement-the-progressive-action-response-composer.md)
- [GH-059 — Define validation results and field-error rendering data](../m4/gh-059-define-validation-results-and-field-error-rendering-data.md)


## Suggested files

- `packages/jsx/src/render-to-string.ts`
- `packages/jsx/src/response.ts`
- `packages/jsx/test/response.test.ts`

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
Stable ID: GH-033
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
