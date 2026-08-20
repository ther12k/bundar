---
type: GitHub Issue Specification
title: GH-074 — Implement the in-process test client and request helpers
description: Application routes can be tested with standards-based Requests and Responses without opening a network port unless a real-server test is required.
tags:
- github-issue
- m5
- testing
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-074
  milestone: M5 — Tooling, Examples & Docs
  labels:
  - type:feature
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-023
  - GH-070
  blocks:
  - GH-075
---

# GH-074 — Implement the in-process test client and request helpers

**Milestone:** M5 — Tooling, Examples & Docs  
**Labels:** `type:feature`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Application routes can be tested with standards-based Requests and Responses without opening a network port unless a real-server test is required.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create `@bundar/testing` with app compilation/injection helpers.
- Support cookies, redirects, form bodies, multipart fixtures, HTMX dialect headers, and response inspection.
- Distinguish in-process semantics from real Bun server semantics.
- Provide leak-safe setup/teardown and test isolation.

## Out of scope

- Browser DOM automation, which remains in the browser harness.

## Acceptance criteria

- [ ] A generated app can test normal, htmx2, htmx4, and no-JS requests from one fixture.
- [ ] Cookies and redirect chains behave predictably.
- [ ] Tests can opt into a real ephemeral server for Bun integration cases.
- [ ] Testing package does not modify production app behavior.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/testing
bun run test:consumer:testing
bun run test:leaks -- testing
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-023 — Close the HTTP core integration and contract test matrix](../m1/gh-023-close-the-http-core-integration-and-contract-test-matrix.md)
- [GH-070 — Create the Bundar CLI package and command framework](gh-070-create-the-bundar-cli-package-and-command-framework.md)

## Blocks

- [GH-075 — Create and verify the minimal starter template](gh-075-create-and-verify-the-minimal-starter-template.md)


## Suggested files

- `packages/testing/**`
- `tests/consumer/testing/**`

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
Stable ID: GH-074
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
