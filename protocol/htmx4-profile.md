---
type: Protocol Specification
title: HTMX 4 Profile and GA Readiness
description: Experimental profile based on htmx 4 beta6, changed semantics, adapter behavior, and conditions for stable support.
tags:
- htmx4
- beta
- profile
- ga
status: draft
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

# Current status

As of August 21, 2026, official htmx materials describe v4 as beta; the recorded implementation profile is `4.0.0-beta6`. This document is deliberately stale-sensitive and must be refreshed when a newer pre-release or GA appears.

# Material changes handled by the adapter

- Fetch-based internals and changed event model.
- Explicit attribute inheritance by default.
- `HX-Source` and `HX-Request-Type` request headers.
- Changed source/target value formats.
- Renamed lifecycle events.
- Extension registration through scripts and hooks rather than htmx 2 callback conventions.
- Error responses swapped by default except excluded statuses.
- Network-based history restoration by default.
- Native partial/update constructs and changed OOB focus.

# Maturity policy

The adapter export exists as experimental. It may change in Bundar minor releases while htmx 4 itself is pre-GA. It becomes stable only after the M7 source diff, adapter update, dual-version CI, unchanged-app test, migration report, ADR, and release gate pass.
