---
type: GitHub Issue Specification
title: GH-066 — Implement security headers, CSP, and nonce propagation
description: Server-rendered documents and locally served HTMX assets can use a secure, configurable response-header policy without breaking progressive enhancement.
tags:
- github-issue
- m4
- security
- security
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-066
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:security
  - area:security
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-018
  - GH-032
  - GH-045
  blocks:
  - GH-068
---

# GH-066 — Implement security headers, CSP, and nonce propagation

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:security`, `area:security`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Server-rendered documents and locally served HTMX assets can use a secure, configurable response-header policy without breaking progressive enhancement.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Implement middleware for CSP, frame ancestors, content sniffing, referrer, permissions, and related approved headers.
- Generate per-response nonces and propagate them to approved script/style helpers.
- Define development relaxations separately from production defaults.
- Document interaction with raw HTML, third-party assets, and inline event attributes.

## Out of scope

- A universal CSP policy suitable for every application.

## Acceptance criteria

- [x] Production fixture runs with a restrictive policy and no unexpected browser CSP errors.
- [x] Nonce values are unpredictable, request-scoped, and not reused.
- [x] Header merge cannot remove mandatory policy silently.
- [x] HTMX local asset works without `unsafe-inline` script by default.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/security/test/headers/**
bun run test:browser:dual -- csp
bun run security:headers
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-018 — Implement startup-composed sync and async middleware](../m1/gh-018-implement-startup-composed-sync-and-async-middleware.md)
- [GH-032 — Implement document, doctype, head, and void-element helpers](../m2/gh-032-implement-document-doctype-head-and-void-element-helpers.md)
- [GH-045 — Implement the HTMX asset registry and local serving contract](../m3/gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md)

## Blocks

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)


## Suggested files

- `packages/security/src/headers.ts`
- `packages/security/src/nonce.ts`
- `packages/security/test/headers/**`

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
Stable ID: GH-066
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

## Closure report

Stable ID: GH-066
Commit / PR: merged `gh-066-security-headers` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/security/src/headers.ts` (new) + index exports, `packages/security/test/headers/security-headers.test.ts` (new, 10 tests), `tools/security/headers-audit.ts` (new) + `security:headers` script, browser fixture security-headers middleware + `csp-headers` scenario in both lanes, `evidence/gh-066/verification-transcript.md` (new).
Commands executed: headers 10/10; `security:headers` audit; both browser lanes with the `csp-headers` scenario (CSP present with nonce, no unsafe-inline for scripts, htmx loaded, nosniff); security + root typecheck; lint; format; full repo 655/655; architecture (77 files); pack:inspect @bundar/security; build; docs validate/links — all exit 0.
Evidence: `evidence/gh-066/verification-transcript.md`; `output/playwright/*/csp.json`.
Contract/API changes: new exports in @bundar/security — `securityHeaders`, `buildCspHeader`, `getNonce`, `SecurityHeaderError`, `NonceContext`, `SecurityHeaderPolicy` types. No existing API changed.
Security/performance impact: nonce-based CSP (crypto.getRandomValues per request, 100-request uniqueness proven); mandatory CSP directives (default-src, object-src, base-uri, frame-ancestors) cannot be overridden or silently removed by handler-set headers; development mode is an explicit opt-in with documented relaxations; full header set (nosniff, frame DENY, referrer, permissions, HSTS, COOP); htmx loads without unsafe-inline for scripts. Real finding: htmx's runtime inline-style injection for hx-indicator requires either the development profile or disabling includeIndicatorStyles (documented).
Remaining risks: htmx hx-indicator inline styles; inline scripts require nonce attributes; development relaxations are opt-in.
Documentation updated: this closure record, `issues/m4/index.md`, `log.md`.
Newly unblocked issues: GH-068 (all dependencies complete!).
