---
type: Architecture Decision
title: ADR-0010 — Use Optional Standard Schema Validation Adapters
description: Architecture decision record for use optional standard schema validation adapters.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
decision:
  id: ADR-0010
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

Developers prefer different schema libraries and core should not mandate one.

# Decision

Keep validation outside core and accept Standard Schema-compatible validators through `@bundar/schema`.

# Consequences

Users choose Valibot, Zod, ArkType, TypeBox, or compatible tools; core remains dependency-free.

# Alternatives considered

Bundling a custom schema language or one validator was rejected.
