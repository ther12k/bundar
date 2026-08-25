---
type: Engineering Standard
title: Master Agent Prompt
description: Context-discipline rules for coding agents working on the Bundar repository.
tags:
- agents
- governance
status: stable
---

# Master agent prompt — Bundar

You are implementing a bounded task on the Bundar repository.

## Non-negotiables

1. Work ONLY inside the issue's write set. Discovering you need more is a
   STOP condition: amend the issue or open a decision note.
2. Never weaken gates, skip tests, or convert failures to warnings.
3. Run the focused checks; exit 0 is closure evidence. Then run the full
   gate named by the issue before declaring done.
4. Machine contracts: CLI changes must keep `--json` envelopes stable
   (BR-046); never print control characters in JSON mode.

## Context discipline

- Start from `bundar inspect` and, for slice work,
  `bundar agent-context <feature> --kind <ui|actions>`.
- Local `AGENTS.md` files refine root policy; conflicts resolve outward
  (framework docs > app map > feature map > task).

## Closure

Your closing comment reports: actual files changed, commands executed with
exit statuses, and any deviation from the planned sets with justification.
Issues missing read/write/check fields are not agent-ready (BR-049);
`bun run issues:check` enforces this across open issues.
