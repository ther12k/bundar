---
type: Architecture Decision
title: ADR-0005 — Use Official HTMX Rather Than Reimplementing It
description: Architecture decision record for use official htmx rather than reimplementing it.
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
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
decision:
  id: ADR-0005
  state: proposed
---

# Status

**Proposed** — requires maintainer review before implementation is treated as binding.

# Context

HTMX already provides the browser hypermedia runtime and a maintained protocol ecosystem.

# Decision

Applications install official `htmx.org`; Bundar integrates through server adapters, typed attributes, assets, and conformance tests.

# Consequences

Bundar avoids browser-runtime maintenance and upstream divergence. Compatibility work remains necessary at major versions.

# Alternatives considered

A custom mini-HTMX runtime was rejected as a separate high-risk product.
