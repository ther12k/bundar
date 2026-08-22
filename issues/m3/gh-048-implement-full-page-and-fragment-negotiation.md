---
type: GitHub Issue Specification
title: GH-048 — Implement full-page and fragment negotiation
description: One route can return a complete document for ordinary navigation and an HTML fragment for enhanced requests through normalized metadata.
tags:
- github-issue
- m3
- htmx
- feature
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-048
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:feature
  - area:htmx
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-033
  - GH-041
  blocks:
  - GH-049
  - GH-050
  - GH-053
  - GH-054
  - GH-065
---

# GH-048 — Implement full-page and fragment negotiation

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:feature`, `area:htmx`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

One route can return a complete document for ordinary navigation and an HTML fragment for enhanced requests through normalized metadata.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define `view()`/approved page-fragment response API.
- Negotiate normal, boosted, fragment, and history-restore requests through the selected dialect.
- Add layout invocation and fragment-only rendering paths.
- Make cache variation and representation identity available to later policy.

## Out of scope

- Form mutation actions.

## Acceptance criteria

- [x] The same handler returns a complete document to a normal browser and fragment to HTMX.
- [x] History restore does not accidentally install a fragment as a document.
- [x] No handler reads raw HTMX headers.
- [x] No-JS navigation remains valid HTML and usable.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/render-negotiation/**
bun run test:browser:dual -- page-fragment
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-033 — Implement renderToString and JSX Response integration](../m2/gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-041 — Implement normalized HTMX request metadata](gh-041-implement-normalized-htmx-request-metadata.md)

## Blocks

- [GH-049 — Implement cache variation and history safety policy](gh-049-implement-cache-variation-and-history-safety-policy.md)
- [GH-050 — Implement the progressive action response composer](gh-050-implement-the-progressive-action-response-composer.md)
- [GH-053 — Close the HTMX 2 browser conformance profile](gh-053-close-the-htmx-2-browser-conformance-profile.md)
- [GH-054 — Close the HTMX 4 beta browser conformance profile](gh-054-close-the-htmx-4-beta-browser-conformance-profile.md)
- [GH-065 — Implement page-versus-fragment error negotiation](../m4/gh-065-implement-page-versus-fragment-error-negotiation.md)


## Suggested files

- `packages/htmx/src/view.ts`
- `packages/htmx/test/render-negotiation/**`
- `examples/fixtures/page-fragment/**`

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
Stable ID: GH-048
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

Stable ID: GH-048
Commit / PR: merged `gh-048-negotiation` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/htmx/src/view.ts` (new), `packages/htmx/src/index.ts`, `packages/htmx/package.json` (+`@bundar/jsx` workspace dependency, allowed by ADR-0016), `packages/htmx/test/render-negotiation/view.test.ts` (new, 18 tests), root `tsconfig.json` (`@bundar/jsx` path), `tests/browser/server.ts` (`/page-fragment` via `view()`), `tests/browser/run.ts` (negotiation + boosted scenarios in both lanes), `fixtures/cross-dialect-app/index.html` (boosted link), `packages/htmx/README.md`, `evidence/gh-048/verification-transcript.md` (new).
Commands executed: focused negotiation tests 18/18; `test:browser:htmx2` and `test:browser:htmx4` (new scenarios green; tooling decision: dual coverage via both existing lanes instead of the planned `test:browser:dual`, documented in the transcript); pack:inspect htmx+jsx; architecture:check; format/lint/typecheck (root + package); full `bun test` 370/370; build; docs validate/links; bench:parity — all exit 0.
Evidence: `evidence/gh-048/verification-transcript.md`; browser artifacts `output/playwright/{htmx2,htmx4}/negotiation.json` and `boosted-state.json`; report.json negotiation records.
Contract/API changes: new public API — `view()`, `negotiateView()`, `VIEW_VARY_HEADERS`, `ViewDefinitionError` and associated types in `@bundar/htmx`; @bundar/htmx gained its first workspace dependency (`@bundar/jsx`, explicitly permitted by the frozen boundary rules).
Security/performance impact: handlers read no raw client headers (normalized metadata only); every response carries the negotiation `Vary` so caches cannot serve the wrong representation; client values remain untrusted data.
Remaining risks: htmx 4 beta lane DOM behavior recorded as observation (server-side negotiation is dialect-independent and hard-asserted in both lanes); canonical `Vary` names must be revisited if a future dialect renames the boosting/history headers.
Documentation updated: `packages/htmx/README.md`, this closure report, `issues/m3/index.md`, `log.md`.
Newly unblocked issues: GH-049, GH-050, GH-053, GH-054, GH-065.
