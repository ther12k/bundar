---
type: Guide
title: Project Structure
description: How to organize a Bundar application - feature slices, the compact starter layout, dependency direction, and agent-friendly conventions.
tags:
- guide
- structure
- applications
status: stable
updated: '2026-08-23'
---

# Project structure

Bundar keeps your UI and backend in one server-rendered codebase — no
separate frontend repository, JSON API, or hydration boundary. One codebase
still needs predictable file separation. Bundar recommends **feature
slices** (full decision record: [ADR-0019](../../decisions/0019-agent-friendly-feature-slices.md)).

## Starting compact

Small applications start with four files:

```text
src/
  main.ts        # Bun.serve bootstrap
  app.ts         # composition + routes
  ui.tsx         # pages and fragments
  schema.ts      # input contracts
  types.ts       # domain models
```

## Growing into feature slices

When a file passes ~200 lines, or a second aggregate appears, split by
feature:

```text
src/
  main.ts                  # bootstrap only
  app.ts                   # wires feature routes together
  platform/
    dialect.ts             # htmx dialect choice
    session.ts             # sessions + cookies
    environment.ts         # env parsing
  features/
    todos/
      todos.routes.ts      # HTTP + HTMX orchestration
      todos.actions.ts     # business use cases
      todos.schema.ts      # input validation contract
      todos.repository.ts  # persistence port (+ fixture adapter)
      todos.types.ts       # domain + read models
      todos.view.tsx       # pages and fragments
      todos.components.tsx # small reusable server UI
      todos.test.ts
      AGENTS.md            # local context for coding agents
```

## The one rule that matters

Dependency direction never changes between layouts:

```text
routes → actions → domain/repository ports
routes → views
views  → typed read models
```

Actions never import JSX, HTMX, `Request`, `Response`, or route contexts.
Views render typed read models; they never call actions or repositories.
Full documents and fragments are both produced from the same views — the
[page/fragment negotiation](./architecture.md) happens in routes.

## Working with coding agents

Each slice's `AGENTS.md` bounds what an agent reads and writes for a given
task kind; tasks declare explicit read/write/check sets per the
[agent task contract](../../engineering/agent-task-contract.md). UI-only
tasks never load persistence code; business-rule tasks never load JSX.
