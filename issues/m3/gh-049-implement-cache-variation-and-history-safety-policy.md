---
type: GitHub Issue Specification
title: GH-049 — Implement cache variation and history safety policy
description: Caches and browser history cannot confuse full documents, fragments, dialect-specific representations, or authenticated content.
tags:
- github-issue
- m3
- htmx
- security
- p0
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-049
  milestone: M3 — HTMX Protocol & Dual Dialects
  labels:
  - type:security
  - area:htmx
  - priority:p0
  - size:m
  priority: p0
  size: m
  depends_on:
  - GH-043
  - GH-044
  - GH-048
  blocks: []
---

# GH-049 — Implement cache variation and history safety policy

**Milestone:** M3 — HTMX Protocol & Dual Dialects  
**Labels:** `type:security`, `area:htmx`, `priority:p0`, `size:m`  
**Priority:** `P0`  
**Size:** `M`

## Outcome

Caches and browser history cannot confuse full documents, fragments, dialect-specific representations, or authenticated content.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Define and implement `Vary` composition for relevant HTMX request headers.
- Define cache-control defaults and opt-ins for page/fragment responses.
- Handle htmx 2 local history and htmx 4 history differences explicitly.
- Add proxy-cache fixtures that reproduce representation poisoning risks.

## Out of scope

- A production CDN integration package.

## Acceptance criteria

- [x] Page and fragment variants never overwrite each other in the test cache.
- [x] Existing Vary values are merged without loss.
- [x] Authenticated/private responses remain private unless explicitly overridden.
- [x] History restore scenarios pass in both lanes or are capability-gated.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/htmx/test/cache/**
bun run test:browser:dual -- history
bun run security:cache
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md)
- [GH-048 — Implement full-page and fragment negotiation](gh-048-implement-full-page-and-fragment-negotiation.md)

## Blocks

- None in this delivery graph.


## Suggested files

- `packages/htmx/src/cache-policy.ts`
- `packages/htmx/test/cache/**`
- `tests/proxy-cache/**`

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
Stable ID: GH-049
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

Stable ID: GH-049
Commit / PR: merged `gh-049-cache-history` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/htmx/src/cache-policy.ts` (new) + index exports, `packages/htmx/test/cache/cache-policy.test.ts` (new, 10 tests), `tests/proxy-cache/{simulated-proxy.ts,poisoning.test.ts}` (new, 5 fixtures), `tools/security/cache-audit.ts` + `security:cache` script, browser lane Vary assertions + history-restore scenario (both lanes), `packages/htmx/README.md`, `evidence/gh-049/{verification-transcript.md,cache-audit.json}` (new).
Commands executed: cache+proxy tests 15/15; `security:cache` audit; both browser lanes with the history-restore scenario and exact-Vary assertions; htmx package + root typecheck; lint; format; full repo 531/531; architecture (63 files); pack:inspect @bundar/htmx; build; docs validate/links — all exit 0. Tooling decision: dual-lane browser substitution for the planned `test:browser:dual -- history`.
Evidence: `evidence/gh-049/verification-transcript.md`; `evidence/gh-049/cache-audit.json`; `output/playwright/*/history-restore.json`.
Contract/API changes: new exports in @bundar/htmx — `cachePolicyFor`, `applyCachePolicy`, `mergeVary`, `historyPolicyFor`, `CachePolicyError`, `CACHE_VARY_HEADERS` + option/result types. No existing API changed.
Security/performance impact: representation poisoning is structurally prevented under the policy (all four negotiation variants distinct; missing Vary poisoning reproduced as documentation); private/no-store never stored; unsafe opt-in combinations rejected at policy build; handler Cache-Control overrides survive; per-dialect history facts are pinned data.
Remaining risks: partial handler-supplied Vary keeps a residual window (documented with fixture); the simulated proxy is minimal by design; htmx 4 beta history internals provisional until GA revalidation.
Documentation updated: htmx README, this closure record, `issues/m3/index.md`, `log.md`.
Newly unblocked issues: none directly (strengthens GH-050+ consumers).
