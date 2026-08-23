---
type: Engineering Standard
title: Agent Context Contract
description: The bundar agent-context command - bounded deterministic packs per task kind, budget rules, exclusions, and integration with agent maps.
tags:
- agents
- tooling
- context
status: stable
updated: '2026-08-23'
---

# Agent context contract

`bundar agent-context <feature> [--app dir] [--kind ui|actions] [--format md|json] [--max-bytes n] [--include-diff]`
(BR-048) turns the conventions of [ADR-0019](../decisions/0019-agent-friendly-feature-slices.md)
into a first-party tool.

## Pack contents

| Section | Source |
| --- | --- |
| Summary / invariants | the slice's `AGENTS.md` (`Purpose:` / `Escalate when:`) — never restated here |
| Public APIs | exported symbols of writable sources (+ entrypoint for UI kind) |
| Direct dependencies | import specifiers of scoped sources |
| Direct dependents | app files outside the slice importing into it |
| Read-only evidence | slice files NOT owned by this task kind |
| Writable paths | ownership per kind (below) |
| Commands | focused checks from the app manifest (`typecheck`, `test`, `app:arch`) |
| Unresolved TODOs | TODO/FIXME in scoped sources |

## Kind ownership

| Kind | Writable | Deliberately excluded |
| --- | --- | --- |
| `ui` | `*.view.tsx`, `*.components.tsx` | repository/action internals (visible as evidence only) |
| `actions` | `*.actions.*`, `*.schema.*`, `*.types.*`, `*.repository.*` | entrypoint, JSX/HTMX sources, their imports |

## Guarantees

- Deterministic byte-identical output for identical inputs.
- No writes; no network; `.env`, credentials, build artifacts, and
  dependency directories are structurally unreachable.
- Budget fail-closed at 16 KB unless `--max-bytes <n>` is passed.
- In `--json` mode the pack rides inside the BR-046 envelope under `data`.

## Relationship to maps and tasks

Local [agent maps](agent-maps.md) declare purpose and zones;
[task metadata](agent-task-contract.md) narrows them per assignment. This
command MECHANIZES both so an agent starts from evidence instead of
crawling the repository.
