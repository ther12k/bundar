---
type: GitHub Issue Specification
title: GH-031 — Implement explicit raw HTML and trust-boundary controls
description: Trusted raw HTML is possible only through an obvious, auditable API that cannot be confused with escaped text.
tags:
- github-issue
- m2
- jsx
- security
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-031
  milestone: M2 — Server JSX Runtime
  labels:
  - type:security
  - area:jsx
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-027
  blocks:
  - GH-036
---

# GH-031 — Implement explicit raw HTML and trust-boundary controls

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:security`, `area:jsx`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Trusted raw HTML is possible only through an obvious, auditable API that cannot be confused with escaped text.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define a branded `raw()`/`unsafeHtml()` value and approved naming.
- Require deliberate construction and preserve the brand through rendering.
- Add source-scanning/lint support for raw HTML call sites.
- Document sanitization responsibility and safe alternatives.

## Out of scope

- Bundled HTML sanitizer or trusted-types polyfill in v0.1.

## Acceptance criteria

- [ ] Ordinary strings always escape even when typed broadly.
- [ ] Only branded values bypass text escaping.
- [ ] Raw values cannot be forged accidentally through plain object shape.
- [ ] Security tests cover script, SVG, attribute, comment, and closing-tag payloads.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/security/raw-html.test.ts
bun run security:raw-html-audit
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-027 — Implement safe text, primitive, and empty-child rendering](gh-027-implement-safe-text-primitive-and-empty-child-rendering.md)

## Blocks

- [GH-036 — Close JSX conformance, security, and snapshot coverage](gh-036-close-jsx-conformance-security-and-snapshot-coverage.md)


## Suggested files

- `packages/jsx/src/raw.ts`
- `packages/jsx/test/security/raw-html.test.ts`
- `tools/security/raw-html-audit.ts`

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
Stable ID: GH-031
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
