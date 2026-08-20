---
type: Architecture Decision
title: ADR-0004 — Build a Server-Only JSX Runtime
description: Architecture decision record for build a server-only jsx runtime.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: hono-jsx
  resource: https://hono.dev/docs/guides/jsx
  title: Hono JSX guide
  author: team:hono
  last_modified: '2026-08-12'
decision:
  id: ADR-0004
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

The framework needs typed component composition without a hydration or virtual-DOM tax.

# Decision

Implement an HTML JSX runtime with escaping, components, async nodes, strings, and streams; explicitly exclude client lifecycle and React compatibility.

# Consequences

The renderer is small and aligned with HTMX. Client interactivity uses HTML controls, htmx, and optional scripts.

# Alternatives considered

React server rendering was rejected because it imports a much larger semantic contract. Reusing Hono JSX remains a benchmark/reference option but would reduce control over the focused API.
