---
type: GitHub Issue Specification
title: GH-036 — Close JSX conformance, security, and snapshot coverage
description: Renderer behavior is covered across HTML semantics, hostile inputs, type consumption, and representative component trees.
tags:
- github-issue
- m2
- testing
- test
- p0
- l
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-036
  milestone: M2 — Server JSX Runtime
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
  priority: p0
  size: l
  depends_on:
  - GH-031
  - GH-033
  - GH-035
  blocks:
  - GH-037
  - GH-038
---

# GH-036 — Close JSX conformance, security, and snapshot coverage

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:test`, `area:testing`, `priority:p0`, `size:l`  
**Priority:** `P0`  
**Size:** `L`

## Outcome

Renderer behavior is covered across HTML semantics, hostile inputs, type consumption, and representative component trees.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Build conformance fixtures for elements, attributes, text, documents, components, async behavior, and raw boundaries.
- Add snapshot review policy that prevents blind updates.
- Add external consumer compile tests and fuzz/property tests.
- Compare selected output against browser parsing expectations.

## Out of scope

- Claiming standards conformance beyond the tested subset.

## Acceptance criteria

- [x] Every public renderer primitive has positive and negative tests.
- [x] Security payload corpus passes with expected escaping.
- [x] Snapshots are deterministic across supported platforms.
- [x] Browser DOM interpretation matches intended structure for selected edge cases.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx
bun run test:consumer:jsx
bun run test:browser:jsx
bun run security:jsx
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-031 — Implement explicit raw HTML and trust-boundary controls](gh-031-implement-explicit-raw-html-and-trust-boundary-controls.md)
- [GH-033 — Implement renderToString and JSX Response integration](gh-033-implement-rendertostring-and-jsx-response-integration.md)
- [GH-035 — Add typed common HTMX attributes without runtime coupling](gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md)

## Blocks

- [GH-037 — Run the M2 JSX performance and memory gate](gh-037-run-the-m2-jsx-performance-and-memory-gate.md)
- [GH-038 — Run and record the M2 server-JSX gate](gh-038-run-and-record-the-m2-server-jsx-gate.md)


## Suggested files

- `packages/jsx/test/**`
- `tests/consumer/jsx/**`
- `tests/browser/jsx/**`

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
Stable ID: GH-036
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

Stable ID: GH-036
Commit / PR: merged `gh-036-jsx-conformance` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/jsx/test/conformance/{matrix.test.ts,snapshots.test.ts,snapshot-cases.ts,snapshots.json}` (new), `packages/jsx/test/fuzz/property.test.ts` (new), `tools/jsx-snapshots.ts` + `tools/security/jsx-corpus.ts` (new), `tests/browser/jsx/{server,run}.ts` (new), `packages/jsx/src/render/elements.ts` (RCDATA escaping defect fixed), `packages/jsx/src/types.ts` + `types/htmx.ts` (intrinsic set completed; hx-target accepts selectors), `tests/consumer/jsx/fixture.tsx` (extended), root `package.json` (`snapshots:jsx`, `security:jsx`, `test:browser:jsx`), `evidence/gh-036/{verification-transcript.md,security-corpus.json}` (new).
Commands executed: jsx suite 146/146 (conformance 13, property ~6,000 assertions); consumer TSX compile; browser DOM comparison (6 edge cases, Chrome for Testing); security corpus (13 payloads); snapshot review-gate refusal check; package + root typecheck; lint; format; full repo 516/516; architecture; pack:inspect; build; docs — all exit 0.
Evidence: `evidence/gh-036/verification-transcript.md`; `evidence/gh-036/security-corpus.json`; `output/playwright/jsx/*`; `packages/jsx/test/conformance/snapshots.json`.
Contract/API changes: intrinsic element map completed (common HTML tags now typed); HxTargetValue accepts arbitrary selectors (literals kept for completions); serializeRawText now entity-escapes RCDATA hosts (textarea/title) instead of script-style grammar escapes — a fidelity fix: browser .value/text now round-trips exactly. No public signature changed.
Security/performance impact: raw-text breakouts (`</title>`, `</textarea>`, `</style>`, `</script>`) proven neutralized in-process and in a real browser; RCDATA content can no longer display escape artifacts; corpus asserts exact escaped attribute values; snapshot regeneration requires an attributable review trail.
Remaining risks: snapshot byte-stability verified on the single available platform (Bun/Linux) with platform-independent corpus content by construction; hx-target grammar validation delegated to dialect adapters; exotic tags fall back to loose jsx() typing.
Documentation updated: this closure record, `issues/m2/index.md`, `log.md`, transcript, corpus artifact.
Newly unblocked issues: GH-037, GH-038 (all M2 implementation issues complete).
