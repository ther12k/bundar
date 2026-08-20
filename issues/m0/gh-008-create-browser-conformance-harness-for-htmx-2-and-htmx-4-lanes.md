---
type: GitHub Issue Specification
title: GH-008 — Create browser conformance harness for HTMX 2 and HTMX 4 lanes
description: The same browser scenarios can execute against pinned HTMX 2 and HTMX 4 versions with traceable protocol evidence.
tags:
- github-issue
- m0
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-008
  milestone: M0 — Contracts & Foundation
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-001
  - GH-005
  blocks:
  - GH-010
  - GH-053
  - GH-054
---

# GH-008 — Create browser conformance harness for HTMX 2 and HTMX 4 lanes

**Milestone:** M0 — Contracts & Foundation  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

The same browser scenarios can execute against pinned HTMX 2 and HTMX 4 versions with traceable protocol evidence.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Create Playwright or equivalent browser matrix with separate htmx2 and htmx4 projects.
- Pin upstream assets or packages and record exact versions.
- Capture requests, response headers, DOM snapshots, console errors, history state, and streamed/partial behavior.
- Provide an upstream-unavailable skip policy that cannot be mistaken for a pass.

## Out of scope

- Claiming HTMX 4 GA compatibility while testing a beta.

## Acceptance criteria

- [ ] A smoke page runs in both lanes.
- [ ] The report identifies exact HTMX artifact hashes or versions.
- [ ] A deliberately incorrect header/event fixture fails in the appropriate lane.
- [ ] Experimental htmx 4 failures are reported separately from stable-lane failures.
- [ ] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [ ] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [ ] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun run test:browser:htmx2
bun run test:browser:htmx4
bun run test:browser:report
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-001 — Initialize the Bun workspace and repository skeleton](gh-001-initialize-the-bun-workspace-and-repository-skeleton.md)
- [GH-005 — Freeze public API principles and package boundaries](gh-005-freeze-public-api-principles-and-package-boundaries.md)

## Blocks

- [GH-010 — Run and record the M0 contract-freeze gate](gh-010-run-and-record-the-m0-contract-freeze-gate.md)
- [GH-053 — Close the HTMX 2 browser conformance profile](../m3/gh-053-close-the-htmx-2-browser-conformance-profile.md)
- [GH-054 — Close the HTMX 4 beta browser conformance profile](../m3/gh-054-close-the-htmx-4-beta-browser-conformance-profile.md)


## Suggested files

- `tests/browser/**`
- `fixtures/htmx/**`
- `playwright.config.ts`

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
Stable ID: GH-008
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

## Closure record (2026-08-21)

Stable ID: GH-008
Commit / PR: branch `gh-008-browser-conformance`; local implementation commit to be merged after repository gates.
Files changed: `tests/browser/{server.ts,run.ts,report.ts}`, `fixtures/cross-dialect-app/index.html`, `fixtures/htmx2/{README.md,htmx.min.js}`, `fixtures/htmx4/{README.md,htmx.min.js}`, root `package.json`, `.gitignore`, `.prettierignore`, `evidence/gh-008/{report.json,verification-transcript.md}`, `issues/m0/index.md`, and `log.md`.
Commands executed: `bun run test:browser:htmx2`, `bun run test:browser:htmx4`, and `bun run test:browser:report` — all exit 0. Full repository verification is required before merge.
Evidence: combined report at `evidence/gh-008/report.json`; exact lane artifacts under `output/playwright/htmx2/` and `output/playwright/htmx4/` during local runs; transcript at `evidence/gh-008/verification-transcript.md`.
Contract/API changes: browser-test and fixture tooling only; no Bundar runtime package API changes. htmx2 is the stable pinned lane; htmx4 `4.0.0-beta6` remains experimental and is explicitly not GA evidence.
Security/performance impact: no external publication or production listener; negative header fixture fails closed; no performance claim is made.
Remaining risks: htmx4 lifecycle state differs (`event: none` versus stable htmx2 `event: afterRequest`) and requires future adapter mapping; streaming/partial transport and Bundar runtime conformance remain future work.
Documentation updated: `fixtures/htmx2/README.md`, `fixtures/htmx4/README.md`, `protocol/compatibility-matrix.md` and `engineering/browser-conformance.md` are the governing compatibility/conformance references; `evidence/gh-008/verification-transcript.md` and `log.md` record this run.
Newly unblocked issues: GH-010 M0 contract-freeze gate; GH-053 and GH-054 receive the browser harness and remain responsible for closing their respective dialect profiles.
