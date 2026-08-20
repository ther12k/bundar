---
type: Architecture Decision
title: ADR-0003 — Compile to the Native Bun Router
description: Architecture decision record for compile to the native bun router.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: bun-routing
  resource: https://bun.com/docs/runtime/http/routing
  title: Bun.serve routing documentation
  author: team:bun
  last_modified: '2026-08-21'
decision:
  id: ADR-0003
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

Bun already provides parameterized, wildcard, method-specific, and static routes.

# Decision

Collect route descriptors and compile them to `Bun.serve({ routes })`; do not match general application routes in a Bundar request-time router.

# Consequences

Route performance and precedence follow Bun. Bundar must validate ownership and types without promising behavior Bun does not expose.

# Alternatives considered

A custom radix router and URLPattern matcher were rejected as duplicate complexity.
