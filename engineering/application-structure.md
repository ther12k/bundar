---
type: Engineering Standard
title: Application Structure Standard
description: Canonical feature-slice layout, compact alternative, naming conventions, and graduation rules for Bundar applications.
tags:
- applications
- structure
- agent-friendly
status: stable
updated: '2026-08-23'
---

# Application structure standard

Decision record: [ADR-0019](../decisions/0019-agent-friendly-feature-slices.md).
Enforcement policy: [application import policy](application-import-policy.md).

## Naming conventions

| File | Contains | May import |
| --- | --- | --- |
| `main.ts` | `Bun.serve` bootstrap, port, error boundary wiring | `app.ts`, `platform/` |
| `app.ts` | route/module composition only | features' `*.routes.ts`, `platform/` |
| `<f>.routes.ts` | handlers: negotiate views, call actions, build responses | actions, schema (parse), views, types |
| `<f>.actions.ts` | business use cases, transactions | types, repository port |
| `<f>.schema.ts` | input contracts (Standard Schema or custom) | types |
| `<f>.repository.ts` | persistence port + fixture adapter | types |
| `<f>.types.ts` | domain models + typed read models | nothing app-internal |
| `<f>.view.tsx` | page and fragment components | types (read models), components |
| `<f>.components.tsx` | small reusable server UI | types |
| `<f>.test.ts` | behavior tests for the slice | everything in slice |

## Rules

1. One feature directory per aggregate; cross-feature reads go through the
   owning feature's actions/types — never its repository.
2. `platform/` owns dialect choice, sessions, environment. Features import
   platform; platform never imports features.
3. Views receive typed read models; they never call actions or repositories.
4. Tests may import anything inside their own slice plus `platform/`.

## Graduation trigger

Move compact → sliced when ANY of: a file passes ~200 lines, a second
aggregate appears, or two agents need to work the same area concurrently.
Graduation is mechanical because both layouts share one dependency
direction.

## Agent zones

Every feature carries an `AGENTS.md` declaring: what the slice owns, its
invariants, allowed edit targets per task kind, forbidden changes, and the
slice's verification commands. See the [agent task contract](agent-task-contract.md).
