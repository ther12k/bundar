---
type: Reference
title: HTMX 2 Stable Baseline Notes
description: Source snapshot for request/response headers, events, response handling, and migration-relevant htmx 2 behavior.
tags:
- htmx2
- reference
status: stable
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-21'
sources:
- id: htmx-2-docs
  resource: https://htmx.org/docs/
  title: htmx 2 documentation
  author: team:htmx
  last_modified: '2026-08-21'
---

# Baseline

The official site observed on August 21, 2026 presents htmx 2.0.10 in its quick start. Request headers include `HX-Request`, target, trigger, trigger name, current URL, boost, prompt, and history restore. Response headers include location, redirects, history updates, retarget/reselect/reswap, refresh, and event triggers.

# Migration relevance

Error response handling, implicit inheritance, lifecycle event names, extension APIs, and local history behavior differ from the htmx 4 profile. Bundar must normalize them rather than assume parity.
