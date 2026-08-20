---
type: Architecture Decision
title: ADR-0013 — Use Focused Packages and Versioned HTMX Subpaths
description: Architecture decision record for use focused packages and versioned htmx subpaths.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
decision:
  id: ADR-0013
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

One package would couple optional tooling and make version-specific adapters harder to isolate.

# Decision

Use focused packages and export adapters as `@bundar/htmx/2` and `@bundar/htmx/4`.

# Consequences

Users install only needed capabilities while switching dialects through one import. Package count must not fragment tiny internal helpers unnecessarily.

# Alternatives considered

Separate npm packages for every adapter were considered but rejected initially in favor of subpath exports.
