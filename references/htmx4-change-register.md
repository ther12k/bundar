---
type: Reference
title: HTMX 4 Beta Change Register
description: Current migration-relevant differences observed in official htmx 4 beta documentation and release artifacts.
tags:
- htmx4
- changes
- reference
status: stable
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-01'
sources:
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
- id: htmx-4-beta6
  resource: https://github.com/bigskysoftware/htmx/releases/tag/v4.0.0-beta6
  title: htmx 4.0.0-beta6 release
  author: team:htmx
  last_modified: '2026-07-23'
- id: htmx-2-compat
  resource: https://four.htmx.org/extensions/htmx-2-compat
  title: Official htmx 2 compatibility extension for htmx 4
  author: team:htmx
  last_modified: '2026-08-21'
---

# Snapshot

Official sources observed htmx `4.0.0-beta6`, released July 23, 2026, and still described v4 as beta on August 21, 2026.

# Changes affecting Bundar

- Core networking moves from XMLHttpRequest to fetch.
- Attribute inheritance is explicit by default.
- Local history caching is no longer default.
- Events use a new phase/system naming model.
- Custom extensions use registered hooks; `hx-ext` is removed from the main model.
- Request source and representation headers change.
- Error responses swap by default except configured no-swap statuses.
- New partial and streaming features alter multi-region update opportunities.
- The official compatibility extension can restore several htmx 2 conventions temporarily.

# Review rule

This register must be diffed against GA before stable support. It is not a frozen specification.
