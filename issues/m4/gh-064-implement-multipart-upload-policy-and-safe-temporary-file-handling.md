---
type: GitHub Issue Specification
title: GH-064 — Implement multipart upload policy and safe temporary-file handling
description: File-upload forms enforce bounded, explicit handling and never imply that MIME metadata or filenames are trusted.
tags:
- github-issue
- m4
- forms
- security
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-064
  milestone: M4 — Forms, Actions & Security
  labels:
  - type:security
  - area:forms
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-057
  - GH-061
  blocks:
  - GH-068
---

# GH-064 — Implement multipart upload policy and safe temporary-file handling

**Milestone:** M4 — Forms, Actions & Security  
**Labels:** `type:security`, `area:forms`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

File-upload forms enforce bounded, explicit handling and never imply that MIME metadata or filenames are trusted.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define upload limits, allowed media policy hooks, streaming/temp-file lifecycle, cleanup, and abort behavior.
- Normalize safe metadata while retaining original name only as untrusted display data.
- Provide malware-scan/quarantine integration points.
- Add multipart fuzz, truncation, duplicate field, and disconnect tests.

## Out of scope

- Object-storage vendor adapter or malware engine.

## Acceptance criteria

- [ ] Limits are enforced during read rather than after full buffering.
- [ ] Temporary files are removed on success, error, cancellation, and process-test teardown.
- [ ] Paths cannot be selected by client filenames.
- [ ] Production guide requires content validation and scanning appropriate to risk.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/core/test/uploads/**
bun run security:uploads
bun run test:leaks -- uploads
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-057 — Implement bounded form and request-body parsing](gh-057-implement-bounded-form-and-request-body-parsing.md)
- [GH-061 — Implement CSRF primitives and form middleware](gh-061-implement-csrf-primitives-and-form-middleware.md)

## Blocks

- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md)


## Suggested files

- `packages/core/src/request/upload.ts`
- `packages/core/test/uploads/**`
- `docs/guides/uploads.md`

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
Stable ID: GH-064
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
