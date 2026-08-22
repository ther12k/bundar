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

- [x] Limits are enforced during read rather than after full buffering.
- [x] Temporary files are removed on success, error, cancellation, and process-test teardown.
- [x] Paths cannot be selected by client filenames.
- [x] Production guide requires content validation and scanning appropriate to risk.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

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

## Closure report

Stable ID: GH-064
Commit / PR: merged `gh-064-uploads` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/core/src/request/upload.ts` (new, exported via index), `packages/core/test/uploads/upload.test.ts` (new, 14 tests), `tools/security/uploads-audit.ts` + `security:uploads` script, `docs/guides/uploads.md` (new), core export snapshot 71→77 (import test + `artifacts/api/core.md` regenerated deliberately), `evidence/gh-064/verification-transcript.md` (new).
Commands executed: uploads 14/14; `security:uploads` audit; core + root typecheck; lint; format; full repo 581/581; architecture (67 files); pack:inspect @bundar/core (zero runtime deps); api:report + api:check (77 exports); build; docs validate/links — all exit 0. Tooling decision: leak coverage via deterministic lifecycle tests + teardown registry (substitutes the planned `test:leaks -- uploads`).
Evidence: `evidence/gh-064/verification-transcript.md`.
Contract/API changes: new exports in @bundar/core — `handleUploads`, `UploadPolicy`/`DEFAULT_UPLOAD_POLICY`, `StoredUpload`/`UploadMetadata`/`UploadVerifier` types, `sanitizeClientName`, `cleanupAllUploads`, `uploadFileExists`, `UploadPolicyError`. No existing API changed.
Security/performance impact: limits enforced during read (envelope pre-check + per-part caps, never buffer-then-check); client filenames can never select paths (uuid temp names, sanitized display basenames); MIME/filenames treated as untrusted claims; verifier + quarantine hooks are the malware-scan/sniffing integration points; temp files removed on every path plus a teardown registry; production guide mandates content validation and risk-appropriate scanning.
Remaining risks: platform formData materializes each bounded part in memory before persistence (documented; no streaming multipart API in Bun today); claimed types may be platform-normalized (guide mandates sniffing); storage/engines stay app territory.
Documentation updated: `docs/guides/uploads.md`, this closure record, `issues/m4/index.md`, `log.md`, API snapshot.
Newly unblocked issues: contributes to GH-068 (now awaits GH-063 + GH-066 only).
