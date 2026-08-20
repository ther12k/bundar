---
type: Architecture Decision
title: ADR-0012 — Do Not Add Hydration to Bundar Core
description: Architecture decision record for do not add hydration to bundar core.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
decision:
  id: ADR-0012
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

Hydration introduces client component identity, serialization, bundling, and state reconciliation.

# Decision

Keep browser behavior in HTMX and optional isolated scripts. No hydration API belongs in the initial framework.

# Consequences

The mental model remains server-authoritative. Highly interactive islands can use another library explicitly.

# Alternatives considered

React-compatible hydration and a Bundar signal runtime were rejected.
