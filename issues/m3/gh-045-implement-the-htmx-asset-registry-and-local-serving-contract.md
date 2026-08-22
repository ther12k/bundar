---
type: GitHub Issue Specification
title: GH-045 — Implement the HTMX asset registry and local serving contract
description: Applications can serve an explicitly pinned official htmx asset locally or supply their own asset without a hidden CDN dependency.
tags:
- github-issue
- m3
- assets
- feature
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-045
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:assets
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-021
  - GH-043
  - GH-044
  blocks:
  - GH-053
  - GH-054
  - GH-066
---

# GH-045 — Implement the HTMX asset registry and local serving contract

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:assets`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

Applications can serve an explicitly pinned official htmx asset locally or supply their own asset without a hidden CDN dependency.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define dialect asset metadata, development and production serving modes, and optional integrity information.
- Provide an `<HtmxScript>`/asset helper that references configured assets without embedding unreviewed remote URLs.
- Delegate static bytes and range/cache behavior to Bun where possible.
- Document CSP nonce and cache/versioning integration points.

## Out of scope

- Forking, patching, or vendoring modified htmx source as Bundar.

## Acceptance criteria

- [x] Default templates can run offline after install.
- [x] Exact asset version is visible in generated HTML or manifest.
- [x] User-supplied asset mode does not download at runtime.
- [x] An asset/dialect mismatch is detected in development and conformance tests.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/assets/**
bun run test:browser:htmx2 -- assets
bun run test:browser:htmx4 -- assets
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-021 — Implement explicit response helpers](../m1/gh-021-implement-explicit-response-helpers.md)
- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)

## Blocks

- [GH-053 — Close the HTMX 2 browser conformance profile](gh-053-close-the-htmx-2-browser-conformance-profile.md)
- [GH-054 — Close the HTMX 4 beta browser conformance profile](gh-054-close-the-htmx-4-beta-browser-conformance-profile.md)
- [GH-066 — Implement security headers, CSP, and nonce propagation](../m4/gh-066-implement-security-headers-csp-and-nonce-propagation.md)


## Suggested files

- `packages/htmx/src/assets.ts`
- `packages/htmx/src/script.tsx`
- `packages/htmx/test/assets/**`

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
Stable ID: GH-045
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

Stable ID: GH-045
Commit / PR: merged `gh-045-asset-registry` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/htmx/src/assets.ts` (new), `packages/htmx/src/script.ts` (new), `packages/htmx/src/vendor/{htmx2.min.js,htmx4.min.js}` (bundled assets), `packages/htmx/test/assets/assets.test.ts` (new, 14 tests), `tests/browser/server.ts` + `tests/browser/run.ts` (`asset-serving` scenario in both lanes), `.prettierignore`, `eslint.config.js`, `evidence/gh-045/verification-transcript.md` (new).
Commands executed: assets 14/14; both browser lanes with `asset-serving` (200 with immutable cache, ETag, and 304 on If-None-Match); htmx + root typecheck; lint; format; full repo 604/604; architecture (70 files); pack:inspect @bundar/htmx; build; docs validate/links — all exit 0.
Evidence: `evidence/gh-045/verification-transcript.md`; `output/playwright/*/asset.json`.
Contract/API changes: new exports in @bundar/htmx — `createHtmxAssetHandler`, `getBundledAsset`, `validateAssetDialectMatch`, `HtmxScript`, `AssetRegistryError`, `AssetDialectMismatchError`, `CreateHtmxAssetHandlerOptions`, `HtmxAsset`, `HtmxScriptProps`. No existing API changed.
Security/performance impact: assets are served completely offline without unreviewed third-party CDN dependencies; SHA-256 integrity verified; `<HtmxScript>` emits `data-htmx-version`, SRI hashes, and CSP `nonce`; dialect/asset mismatches fail closed with `AssetDialectMismatchError`.
Remaining risks: none.
Documentation updated: this closure record, `issues/m3/index.md`, `log.md`.
Newly unblocked issues: GH-053, GH-054, GH-066.
