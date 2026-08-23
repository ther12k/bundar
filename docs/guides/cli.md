---
type: Guide
title: Bundar CLI
description: Machine-readable CLI contract - global flags, exit codes, JSON envelope, and the inspect command for agents and CI.
tags:
- guide
- cli
- tooling
status: stable
updated: '2026-08-23'
---

# Bundar CLI

`@bundar/cli` powers `bundar <command>`. Agent-facing behavior is a contract
(BR-046), not incidental formatting.

## Global flags

| Flag | Effect |
| --- | --- |
| `--json` | Exactly one versioned JSON envelope on stdout; prompts prohibited |
| `--no-color` | Strip all ANSI styling |
| `--quiet` | Suppress nonessential output |
| `--dry-run` | Describe planned writes without changing anything |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Usage or validation failure (bad flags/args/input paths) |
| `2` | Environment failure (missing tool, prompt required but noninteractive) |
| `3` | Unexpected execution failure |

## JSON envelope (`bundar.cli/1`)

```json
{
  "schema": "bundar.cli/1",
  "ok": true,
  "command": "doctor",
  "exitCode": 0,
  "warnings": [],
  "errors": [],
  "data": {},
  "next": ["bundar routes generate"]
}
```

Key order is fixed; repeated runs over identical input are byte-identical
except explicitly documented timestamps (none today). Control characters
never appear in JSON.

## Commands

### doctor (alias: info)

Secrets-safe environment diagnostics. `--json` puts the fields under
`data` with `next` suggestions.

### routes generate|check

Typed URL builders from named routes (GH-073). `check` fails on drift.

### htmx-audit <path>…

Static htmx 2→4 migration audit (GH-078). Nonexistent input paths exit `1`.

### inspect

Bounded offline project manifest (BR-047): versions, packages, export maps,
entrypoints, dialect, routes (name/method/path via static scan), feature
files with layers, focused checks, and a sha256 `inputHash` over scanned
inputs. Scopes:

```bash
bundar inspect                                   # repository
bundar inspect --scope app --app examples/todo   # one application
bundar inspect --scope feature \
  --app examples/todo --feature todos            # one slice (≤16 KB budget)
```

Validated against `packages/cli/schemas/inspect.schema.json`; no writes,
no network, no secrets.
