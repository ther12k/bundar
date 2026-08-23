---
type: Engineering Standard
title: Agent Task Contract
description: Bounded read/write/verification sets and forbidden-change declarations for coding-agent tasks on Bundar applications.
tags:
- agents
- tasks
- contracts
- applications
status: stable
updated: '2026-08-23'
---

# Agent task contract

Every agent-assigned task on a Bundar application declares four bounded sets
so the agent loads only relevant context and cannot silently expand scope.

## Task metadata

```yaml
task: todos.toggle-optimistic
read_set:
  - src/features/todos/todos.types.ts
  - src/features/todos/todos.actions.ts
write_set:
  - src/features/todos/todos.actions.ts
  - src/features/todos/todos.test.ts
checks:
  - bun test src/features/todos/todos.test.ts
  - bun run typecheck
forbidden_changes:
  - do not change the todos.repository port signature
  - do not add imports from @bundar/htmx into actions
```

## Field semantics

| Field | Meaning |
| --- | --- |
| `read_set` | Files sufficient to understand the change. An agent should never need files outside this set plus their direct imports. |
| `write_set` | Files the task may modify. Anything else is out of scope by construction. |
| `checks` | Focused verification commands; exit 0 is required evidence. |
| `forbidden_changes` | Explicit guardrails (signatures, ports, public exports, security behavior). |

## Slice-level AGENTS.md

Each feature directory carries an `AGENTS.md` with: ownership statement,
invariants, per-task-kind edit targets, forbidden changes, verification
commands, and pointers to the slice's routes/actions/views. It is the FIRST
file an agent reads and replaces repo-wide exploration for scoped work.

## Rules of engagement

1. A task that discovers it needs writes outside its `write_set` STOPS and
   amends the task — never "helpfully" widens scope.
2. Forbidden changes are absolute; if source evidence contradicts them, open
   a decision note instead of editing.
3. `checks` must pass before completion; skipped or weakened checks void the
   task.
