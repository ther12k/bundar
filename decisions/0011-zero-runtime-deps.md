---
type: Architecture Decision
title: ADR-0011 — Keep Core and JSX at Zero Runtime Dependencies
description: Architecture decision record for keep core and jsx at zero runtime dependencies.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
decision:
  id: ADR-0011
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

Small supply-chain and startup surfaces are central to the project value.

# Decision

Set a zero-runtime-dependency policy for `@bundar/core` and `@bundar/jsx`; any exception requires an ADR with measured benefit.

# Consequences

Implementation work may be higher, but ownership and auditability improve. Development dependencies remain allowed.

# Alternatives considered

Depending on a generic router, template engine, or middleware suite was rejected.
