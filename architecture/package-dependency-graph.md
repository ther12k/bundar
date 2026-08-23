---
type: Architecture Specification
title: Package Dependency Graph
description: Frozen allowed dependency matrix for all public @bundar packages with transitional exceptions, as decided by ADR-0018 and enforced by architecture:check.
tags:
- architecture
- packages
- boundaries
status: stable
updated: '2026-08-23'
---

# Package dependency graph

Authoritative decision: [ADR-0018 — Freeze the Post-Alpha Package Dependency
Graph](../decisions/0018-post-alpha-package-boundaries.md). Enforcement:
`bun run architecture:check` (BR-012).

## Allowed edges (target state)

```text
core      ← (nothing)
jsx       ← (nothing)
schema    ← forms, testing, cli
htmx      ← jsx-only dependency; depended on by testing, cli
forms     ← core + schema; depended on by testing, cli
security  ← core; depended on by testing, cli
testing   ← (nothing may depend on testing except tooling)
cli       ← (terminal)
```

Forbidden in every direction not listed above — notably:

- `@bundar/htmx` must never import `@bundar/core`, `@bundar/schema`,
  `@bundar/forms`, or `@bundar/security` (protocol purity).
- `@bundar/core` and `@bundar/jsx` import nothing from any `@bundar/*`
  package.
- No cycles anywhere in the graph.

Tooling carve-out (ADR-0018 §2): `create-bundar` and `@bundar/cli` may
depend on `@bundar/testing` — the scaffolder embeds generated application
test code that imports it.

## Transitional exceptions (ADR-0018 §4)

| Edge | Reason | Expires when |
| --- | --- | --- |
| htmx → core | `form-action.ts` pre-move | BR-015 closes |
| htmx → schema | result types pre-relocation | BR-016 closes |
| schema → core | `sources.ts` parse adapters | BR-016 closes |

An exception that outlives its task fails `architecture:check`.
