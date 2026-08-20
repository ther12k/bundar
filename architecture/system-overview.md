---
type: Architecture Specification
title: Bundar System Overview
description: Top-level components, compile path, request path, dependency direction, and framework boundaries.
tags:
- architecture
- overview
- bun
- htmx
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
---

# Component model

```text
application source
  ├── routes and middleware (@bundar/core)
  ├── server components (@bundar/jsx)
  ├── HTMX dialect selection (@bundar/htmx/2 or /4)
  └── optional schema/testing packages
           │
           ▼ startup compilation
route registry ──► grouped Bun route table ──► Bun.serve
           │
           ├── precomposed middleware plans
           ├── page/fragment/action responders
           └── asset and compatibility profile
```

# Dependency direction

- `core` depends only on Bun and web-standard types.
- `jsx` is independently usable and has no dependency on core or htmx.
- `htmx` depends on shared response and JSX interfaces but core references only a small protocol capability interface, avoiding a hard dependency on a major version.
- `schema`, `testing`, and `cli` depend inward on public contracts; core never imports them.

# Startup path

1. Application registers routes and middleware.
2. Bundar normalizes paths and rejects duplicates.
3. Middleware chains and route plans are compiled once.
4. The selected HTMX dialect provides request parsing, representation-vary rules, browser assets, and compatibility rendering.
5. Bundar emits `Bun.serve` options with native route entries and unmatched/error handlers.

# Request path

Bun matches the route. The compiled handler creates only the context required by that plan, parses HTMX headers through the dialect, runs precomposed middleware, invokes the application handler, and returns its `Response`. Body, form, query, and validation parsing are lazy.

# Architectural test

A source-boundary test must prevent core from importing CLI, schema, testing, application examples, or version-specific adapter internals. Benchmark tests must verify that a static `Response` route can bypass general handler machinery.
