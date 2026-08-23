---
type: Architecture Decision
title: ADR-0019 — Adopt Agent-Friendly Feature-Sliced Application Structure
description: One predictable full-stack repository structure for Bundar applications - feature slices with explicit dependency direction, a compact alternative for tiny apps, and bounded agent task zones.
tags:
- adr
- architecture-decision
- applications
- agent-friendly
status: accepted
updated: '2026-08-23'
decision:
  id: ADR-0019
  state: accepted
---

# Status

**Accepted** — recommended and scaffolded for applications built with Bundar.
The framework runtime never imposes this layout; `create-bundar` scaffolds it.

# Context

Bundar keeps UI and backend in ONE server-rendered codebase — that is the
framework's core advantage (no duplicated JSON API, no generated browser
client, no client state layer, no hydration boundary). But one codebase does
not mean one file. At the audit baseline the minimal starter mixed schema,
UI, and route behavior in `app.ts`, and the Todo reference concentrated
routing, sessions, CSRF, validation, repository operations, rendering,
update intents, and runtime concerns in one large file. Humans navigate that;
coding agents must re-read all of it for any change, and parallel agents
collide on the same file.

# Decision

## 1. Canonical feature slice

```text
src/
  main.ts                    # Bun.serve bootstrap only
  app.ts                     # application composition (routes/modules wiring)
  platform/                  # cross-cutting app concerns
    dialect.ts               #   htmx dialect choice (single source)
    session.ts               #   session store + cookie posture
    environment.ts           #   env parsing
  features/
    <feature>/
      <feature>.routes.ts     # Request/Response/HTMX orchestration
      <feature>.actions.ts    # business use cases (no HTTP types)
      <feature>.schema.ts     # input validation contract
      <feature>.repository.ts # persistence port (+ fixture adapter)
      <feature>.types.ts      # domain + read models
      <feature>.view.tsx      # pages and fragments
      <feature>.components.tsx# reusable server-rendered UI
      <feature>.test.ts
      AGENTS.md               # bounded local context for agents
```

Dependency direction is frozen (see [the import policy](../engineering/application-import-policy.md)):

```text
routes → actions → domain/repository ports
routes → views
views  → typed read models
```

Domain/actions must not import JSX, HTMX protocol names, `Request`,
`Response`, route `Context`, or concrete persistence adapters.

## 2. Compact alternative

Applications with ONE small resource may start compact:

```text
src/
  main.ts
  app.ts          # composition + routes
  ui.tsx          # pages/fragments
  schema.ts       # input contracts
  types.ts        # domain models
```

Graduate to slices when any file exceeds ~200 lines or a second aggregate
appears. The compact tree uses the same dependency direction — graduation is
a file move, not a redesign.

## 3. Ownership of concerns currently mixed in Todo

| Concern | Canonical owner |
| --- | --- |
| Route registration, negotiation calls | `<feature>.routes.ts` |
| Create/toggle/edit/delete use cases | `<feature>.actions.ts` |
| Input validation | `<feature>.schema.ts` |
| In-memory store / persistence seam | `<feature>.repository.ts` |
| Domain types, filter read models | `<feature>.types.ts` |
| List/page/fragment JSX | `<feature>.view.tsx` |
| Count/filter chrome components | `<feature>.components.tsx` |
| Flash/session/CSRF wiring | `platform/` |

## 4. Why this minimizes context

A UI-only change reads `*.view.tsx` + `*.components.tsx` + typed read models
— never repositories or actions. A business-rule change reads actions +
types + repository port — never JSX or HTMX internals. Each `AGENTS.md`
states the slice's invariants so an agent loads hundreds of lines instead of
thousands. Parallel agents work in separate files without write conflicts.

# Consequences

Guides, scaffolding (`create-bundar --structure feature`, BR-025), and the
reference applications adopt this layout; enforcement arrives as an
application-level checker (BR-023), not runtime magic. Existing apps migrate
file-by-file with behavior-preserving moves.
