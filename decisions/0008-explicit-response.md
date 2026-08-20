---
type: Architecture Decision
title: ADR-0008 — Require Explicit Response Results
description: Architecture decision record for require explicit response results.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
decision:
  id: ADR-0008
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

Automatic conversion of strings, objects, JSX, and undefined values creates hidden status, content-type, and serialization rules.

# Decision

Handlers return `Response` or `Promise<Response>`. Bundar helpers generate responses explicitly.

# Consequences

Control flow and web semantics remain visible. Some syntax is more verbose, but helpers cover common cases.

# Alternatives considered

Elysia-style broad return normalization was rejected for the initial core.
