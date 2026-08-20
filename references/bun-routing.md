---
type: Reference
title: Bun Native Routing Notes
description: Native route behavior used by Bundar’s route compiler design.
tags:
- bun
- routing
- reference
status: stable
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-21'
sources:
- id: bun-routing
  resource: https://bun.com/docs/runtime/http/routing
  title: Bun.serve routing documentation
  author: team:bun
  last_modified: '2026-08-21'
---

# Observed interface

`Bun.serve` accepts a `routes` object with static, parameterized, wildcard, and method-specific entries. Route requests extend standard `Request` with route params and cookies.

# Bundar interpretation

The framework should compile descriptors into this table, preserve direct `Response` entries, and use `fetch` for unmatched behavior only. Any unsupported route semantics should be documented rather than recreated invisibly.
