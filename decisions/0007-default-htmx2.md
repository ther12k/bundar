---
type: Architecture Decision
title: ADR-0007 — Keep HTMX 2 as Default Until HTMX 4 GA Gates Pass
description: Architecture decision record for keep htmx 2 as default until htmx 4 ga gates pass.
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
- id: htmx-4-beta6
  resource: https://github.com/bigskysoftware/htmx/releases/tag/v4.0.0-beta6
  title: htmx 4.0.0-beta6 release
  author: team:htmx
  last_modified: '2026-07-23'
decision:
  id: ADR-0007
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

The observed htmx 4 release is beta and its final contract may change.

# Decision

Ship htmx 2 as stable default. Export htmx 4 as experimental. Flip the default only through an ADR after GA source review and M7 conformance.

# Consequences

Users can test v4 early without exposing all users to pre-release churn.

# Alternatives considered

Defaulting to beta6 was rejected as irresponsible for a framework promising migration stability.
