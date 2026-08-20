---
type: Architecture Decision
title: ADR-0009 — Make Progressive Enhancement a Tested Contract
description: Architecture decision record for make progressive enhancement a tested contract.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: htmx-2-docs
  resource: https://htmx.org/docs/
  title: htmx 2 documentation
  author: team:htmx
  last_modified: '2026-08-21'
decision:
  id: ADR-0009
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

HTMX applications can accidentally depend on JavaScript even when markup appears form- or link-based.

# Decision

Reference forms retain method/action and links retain href. Every major workflow receives JavaScript-disabled tests or a documented reason it cannot.

# Consequences

Applications remain resilient and accessible. Some enhanced patterns require explicit fallback design.

# Alternatives considered

Treating no-JS support as documentation-only guidance was rejected.
