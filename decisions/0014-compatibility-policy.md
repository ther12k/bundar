---
type: Architecture Decision
title: ADR-0014 — Define Stability by Tested Profiles, Not Floating Majors
description: Architecture decision record for define stability by tested profiles, not floating majors.
tags:
- adr
- architecture-decision
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
decision:
  id: ADR-0014
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

Bun and HTMX change over time, and vague statements such as “supports htmx 4” become stale.

# Decision

Every release records exact tested Bun, HTMX, browser, and TypeScript versions; semver ranges are backed by CI profiles and a compatibility matrix.

# Consequences

Claims remain auditable and regressions visible. Maintainers must regularly refresh source snapshots.

# Alternatives considered

Unbounded peer ranges and undocumented “latest” support were rejected.
