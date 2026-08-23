---
type: Engineering Standard
title: Application Import Policy
description: Frozen dependency direction inside Bundar applications with allowed and forbidden examples, platform exceptions, and enforcement notes.
tags:
- applications
- imports
- policy
- agent-friendly
status: stable
updated: '2026-08-23'
---

# Application import policy

Frozen direction (ADR-0019). Framework-package boundaries are governed
separately by [ADR-0018](../decisions/0018-post-alpha-package-boundaries.md).

## The direction

```text
routes → actions → domain/repository ports
routes → views
views  → typed read models
```

## Allowed

```ts
// todos.routes.ts
import { toggleTodo } from "./todos.actions";       // routes → actions
import { todoPage } from "./todos.view";            // routes → views

// todos.actions.ts
import type { Todo, TodoFilter } from "./todos.types";        // actions → types
import type { TodoRepository } from "./todos.repository";     // actions → port

// todos.view.tsx
import type { TodoListReadModel } from "./todos.types";       // views → read models

// anything
import { session } from "../platform/session";                // → platform
```

## Forbidden

```ts
// actions must not know HTTP or UI:
import type { Context } from "@bundar/core";      // ✗ in *.actions.ts
import { view } from "@bundar/htmx";              // ✗ in *.actions.ts
import { todoRow } from "./todos.components";     // ✗ in *.actions.ts

// views must not trigger behavior:
import { deleteTodo } from "./todos.actions";     // ✗ in *.view.tsx
import { repo } from "./todos.repository";        // ✗ in *.view.tsx

// domain must not import adapters:
import { sqlite } from "../platform/db";          // ✗ in *.types.ts

// cross-feature reach-through:
import { repo } from "../invoices/invoices.repository"; // ✗ from todos/*
```

## Platform exceptions

`platform/` exists precisely so features share dialect, sessions,
environment, and middleware without importing each other. A feature may
import `platform/`; `platform/` may not import features. Any further
exception requires a note in the application's `docs/architecture-notes.md`
or an explicit entry in the boundary checker configuration (BR-023).

## Why strictness pays

A business-rule task loads `*.actions.ts` + `*.types.ts` + the repository
port — a few hundred lines — and never parses JSX or protocol code. A
UI-only task reads views/components plus typed read models. Both kinds of
tasks finish without reading files their change cannot affect.
