---
type: Product Strategy
title: Vision and Positioning
description: Long-term direction, category definition, differentiators, and product narrative for Bundar.
tags:
- vision
- positioning
- hypermedia
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: hono-jsx
  resource: https://hono.dev/docs/guides/jsx
  title: Hono JSX guide
  author: team:hono
  last_modified: '2026-08-12'
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

# Vision

Make HTML-first application development the easiest and most natural way to build business software on Bun.

# Category

Bundar is an **HTML-first full-stack framework**, not an API framework with optional templates and not a JavaScript SPA framework with server rendering attached. The browser receives HTML as application state; htmx enhances links and forms; targeted JavaScript remains an escape hatch.

# Differentiation

| Alternative | Strength | Bundar distinction |
|---|---|---|
| Raw `Bun.serve` | Minimal and fast | Adds organization, JSX, forms, fragments, security, and protocol conformance without replacing Bun routing. |
| Hono + JSX + htmx | Mature ergonomics and broad runtime support | Bun-only compilation, first-class page/fragment/action behavior, and dual htmx dialect contracts. |
| Elysia | Rich schemas, macros, lifecycle, and typed APIs | Smaller mental model, explicit responses, HTML/form-first orientation, no attempt to match every framework facility. |
| React/Next-style stacks | Rich client ecosystem and hydration | No hydration or client state runtime by default; server authority and progressive enhancement stay central. |
| Server templates + ad hoc htmx | Simple pieces | Typed JSX, normalized HTMX headers, migration tooling, conformance fixtures, and coherent application conventions. |

# Brand narrative

“Bundar” is an Indonesian word associated with a round or circular shape. The metaphor fits a framework that reconnects browser-native HTML, server-side TypeScript, and progressive enhancement: **HTML comes full circle.** The name also begins with “Bun,” making the runtime association memorable without turning the product name into a technical acronym.

# Strategic focus

Win a narrow category first: form-heavy and workflow-heavy Bun applications. Do not dilute the project by chasing multi-runtime parity, React compatibility, or a proprietary browser runtime before Bundar’s core workflows are excellent.
