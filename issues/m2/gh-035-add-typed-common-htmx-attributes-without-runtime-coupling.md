---
type: GitHub Issue Specification
title: GH-035 — Add typed common HTMX attributes without runtime coupling
description: TSX recognizes common stable `hx-*` attributes while the JSX runtime remains independent of any HTMX version package.
tags:
- github-issue
- m2
- jsx
- feature
- p1
- m
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
issue:
  stable_id: GH-035
  milestone: M2 — Server JSX Runtime
  labels:
  - type:feature
  - area:jsx
  - priority:p1
  - size:m
  priority: p1
  size: m
  depends_on:
  - GH-005
  - GH-028
  blocks:
  - GH-036
  - GH-047
  - GH-051
---

# GH-035 — Add typed common HTMX attributes without runtime coupling

**Milestone:** M2 — Server JSX Runtime  
**Labels:** `type:feature`, `area:jsx`, `priority:p1`, `size:m`  
**Priority:** `P1`  
**Size:** `M`

## Outcome

TSX recognizes common stable `hx-*` attributes while the JSX runtime remains independent of any HTMX version package.

## Context

This issue implements one bounded part of the [Bundar roadmap](../../delivery/roadmap.md), follows the [master agent prompt](../../MASTER_AGENT_PROMPT.md), and must satisfy the [release-gate standard](../../engineering/release-gates.md). Stable IDs remain authoritative even after GitHub assigns repository-specific issue numbers.

## Deliverables

- Add string-literal types for stable common attributes and documented open-string escape behavior.
- Keep raw attribute names visible rather than wrapping every element in custom components.
- Separate stable subset from dialect-specific augmentation modules.
- Test HTML output remains ordinary attributes.

## Out of scope

- Parsing request headers or creating response directives.

## Acceptance criteria

- [x] Common htmx attributes typecheck in normal intrinsic elements.
- [x] Unknown experimental attributes can be enabled deliberately without `any` leaking globally.
- [x] JSX package has no runtime dependency on `@bundar/htmx` or htmx.
- [x] Generated HTML does not rewrite attribute names.
- [x] Exact verification commands, environment versions, and evidence locations are attached to the issue or pull request.
- [x] No mandatory test failure is hidden, skipped without reason, or converted into a warning.
- [x] Relevant OKF concepts, compatibility notes, and changelog/log entries are updated in the same change.

## Verification

```bash
bun test packages/jsx/test/types/htmx-attributes.test-d.ts
bun run architecture:check
```

Commands are planned contracts. During implementation, replace unavailable placeholder script names only through a documented tooling decision, and preserve equivalent or stronger evidence.

## Dependencies

- [GH-005 — Freeze public API principles and package boundaries](../m0/gh-005-freeze-public-api-principles-and-package-boundaries.md)
- [GH-028 — Implement HTML attributes, class, style, and boolean serialization](gh-028-implement-html-attributes-class-style-and-boolean-serialization.md)

## Blocks

- [GH-036 — Close JSX conformance, security, and snapshot coverage](gh-036-close-jsx-conformance-security-and-snapshot-coverage.md)
- [GH-047 — Add inheritance and extension compatibility helpers](../m3/gh-047-add-inheritance-and-extension-compatibility-helpers.md)
- [GH-051 — Implement version-neutral out-of-band and partial update intents](../m3/gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md)


## Suggested files

- `packages/jsx/src/types/htmx.ts`
- `packages/jsx/src/types/intrinsic.ts`
- `packages/jsx/test/types/**`

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
Stable ID: GH-035
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

Stable ID: GH-035
Commit / PR: merged `gh-035-typed-htmx-attrs` into `main` (merge commit recorded in `log.md`).
Files changed: `packages/jsx/src/types/htmx.ts` (new), `packages/jsx/src/types/intrinsic.ts` (new — element maps moved out of types.ts and augmented with HtmxAttributes), `packages/jsx/src/types.ts` (re-exports), `packages/jsx/src/index.ts` (public type exports), `packages/jsx/tsconfig.json` + root `tsconfig.json` (react-jsx + jsxImportSource for TSX fixtures), `packages/jsx/test/types/{htmx-attributes.test-d.tsx,htmx-attributes.test.ts}` (new), `packages/jsx/README.md`, `evidence/gh-035/verification-transcript.md` (new).
Commands executed: types runtime tests 5/5; package + root typecheck (TSX type fixture with load-bearing @ts-expect-error); architecture (62 files / 8 rules); pack:inspect @bundar/jsx (zero runtime deps); test:consumer:jsx; lint; format; full suite 496/496; build; docs validate/links — all exit 0.
Evidence: `evidence/gh-035/verification-transcript.md`.
Contract/API changes: new type exports in @bundar/jsx — HtmxAttributes, HtmxStableAttributes, HtmxExperimentalAttributes (augmentation point), HxSwapBase/HxSwapValue, HxTargetValue, HxPushUrlValue, HxParamsValue; every intrinsic element now accepts the stable subset. No runtime code changed.
Security/performance impact: none at runtime (types only); raw attribute names stay visible and unrewritten; server-only event handlers still fail closed (tested); no protocol-string confinement violation (lowercase attribute names are not HX-* protocol strings).
Remaining risks: open-string attributes are validated by dialect adapters, not the JSX runtime (documented); app-level declaration merging is compile-time opt-in (misconfiguration is a type error at the app).
Documentation updated: `packages/jsx/README.md`, this closure record, `issues/m2/index.md`, `log.md`.
Newly unblocked issues: GH-036, GH-047, GH-051.
