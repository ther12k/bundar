---
type: Architecture Specification
title: Streaming, SSE, WebSockets, and Incremental Hypermedia
description: Initial streaming support and boundaries for later SSE, WebSocket, multipart, and htmx 4 partial capabilities.
tags:
- streaming
- sse
- websocket
- multipart
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: bun-1-4
  resource: https://bun.com/blog/bun-v1.4
  title: Bun 1.4 release notes
  author: team:bun
  last_modified: '2026-08-20'
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
---

# Initial support

Core supports standards-based streaming `Response` bodies and JSX render streams with backpressure and abort handling. This is sufficient for large HTML responses and progressive server rendering.

# Optional realtime packages

SSE, WebSockets, and multipart hypermedia belong in optional packages after the core response model is stable. They should emit HTML/update intents rather than inventing a JSON component protocol.

# HTMX 4 opportunity

htmx 4 introduces richer partial and streaming capabilities. Bundar’s normalized update-intent model should allow a v4 adapter to render native partial constructs while a v2 adapter uses supported OOB patterns or extensions.

# Guardrails

- Do not make WebSockets part of the core router abstraction.
- Preserve authorization and CSRF/origin policies for connection setup and messages.
- Define reconnect, ordering, idempotency, and backpressure behavior before marketing realtime support.
- Keep streaming errors observable and bounded.
