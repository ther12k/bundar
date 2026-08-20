---
type: Architecture Decision
title: ADR-0001 — Use Bundar as the Framework Name
description: Architecture decision record for use bundar as the framework name.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: bundar-word
  resource: https://kbbi.web.id/bundar
  title: Indonesian dictionary entry for bundar
  author: publisher:kbbi-web
  last_modified: '2025-12-31'
decision:
  id: ADR-0001
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

The project needs a memorable identity connected to Bun and HTML-first architecture without using a generic technical acronym.

# Decision

Use **Bundar** as the product name, “HTML comes full circle” as the working tagline, and proposed identifiers `bundar` and `@bundar/*`, subject to namespace and legal clearance.

# Consequences

The name provides an Indonesian identity and Bun association. Availability remains a release gate; package scope may fall back to `@bundarjs/*` without renaming the product.

# Alternatives considered

Hybun was considered but felt more constructed and less distinctive. Descriptive names were rejected as difficult to own and remember.
