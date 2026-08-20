---
type: Architecture Specification
title: Request Lifecycle and Execution Plan
description: Deterministic request phases, lazy work, sync fast paths, abort behavior, and response ownership.
tags:
- request
- lifecycle
- middleware
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Lifecycle

```text
Bun route match
  → initialize minimal context
  → parse normalized HTMX metadata when required
  → run before middleware in registration order
  → invoke route handler
  → run after middleware while unwinding
  → validate returned Response
  → return to Bun
  ↘ global error boundary on throw/rejection
```

# Rules

- A handler or middleware may be synchronous or asynchronous.
- A synchronous chain must not be forced through an extra promise settlement path.
- Middleware calls `next()` at most once; double calls fail deterministically in development and tests.
- Body readers are lazy, single-consumption, and share one cached result per reader type when safe.
- `request.signal` is propagated to form parsing, streaming, and user operations.
- Once response headers or a stream are committed, the global error boundary cannot fabricate a replacement response; it records the failure and closes or cancels appropriately.

# Response ownership

Only a route handler, middleware, or error boundary returns the final `Response`. Helpers such as `c.view` and `c.action` are response factories. Bundar does not inspect arbitrary returned objects to guess JSON or HTML.

# Fast paths

Static response descriptors go directly into the native route table. Dynamic routes without middleware, HTMX negotiation, or context extensions use a specialized plan. General context allocation is permitted only when required by the route contract.
