---
type: Architecture Decision
title: ADR-0006 — Isolate HTMX Majors Behind a Dialect Adapter
description: Architecture decision record for isolate htmx majors behind a dialect adapter.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
decision:
  id: ADR-0006
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

HTMX 4 changes request headers, event names, inheritance, extensions, history, error swapping, and partial updates.

# Decision

Define a version-neutral `HtmxDialect` and expose versioned subpath adapters from `@bundar/htmx`.

# Consequences

Application code uses normalized metadata and directives. Adapter complexity is measurable and tested rather than scattered through core.

# Alternatives considered

Direct header handling in core and compile-time code forks were rejected.
