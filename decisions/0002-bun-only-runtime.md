---
type: Architecture Decision
title: ADR-0002 — Support Bun Only in the Initial Major Line
description: Architecture decision record for support bun only in the initial major line.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: bun-1-4
  resource: https://bun.com/blog/bun-v1.4
  title: Bun 1.4 release notes
  author: team:bun
  last_modified: '2026-08-20'
decision:
  id: ADR-0002
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

Cross-runtime abstractions would prevent direct use of Bun routing, static routes, cookies, streams, tests, and build features.

# Decision

Set Bun 1.4.0 as the initial minimum runtime and optimize architecture for Bun rather than adapters for Node, Deno, or edge runtimes.

# Consequences

The implementation stays smaller and can use native capabilities. Users needing portability should choose Hono or another multi-runtime framework. Future runtime support requires a new ADR and evidence.

# Alternatives considered

A WinterCG-first core and Hono adapter were rejected because runtime portability is not Bundar’s differentiator.
