---
type: Product Strategy
title: Competitive Strategy
description: How Bundar should coexist with and differentiate from raw Bun, Hono, Elysia, and SPA-oriented frameworks.
tags:
- competition
- hono
- elysia
- bun
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
- id: hono-jsx
  resource: https://hono.dev/docs/guides/jsx
  title: Hono JSX guide
  author: team:hono
  last_modified: '2026-08-12'
---

# Strategy

Bundar should not compete by copying the largest feature list. It should own the narrow phrase **“Bun-native hypermedia applications.”**

# Against raw Bun

Preserve raw Bun’s performance and primitives while providing repeatable structure: modules, middleware, JSX, page/fragment negotiation, forms, security, testing, and release conventions.

# Alongside Hono

Hono is a strong multi-runtime web framework with JSX. Bundar should borrow clarity from its API but justify itself through Bun-specific route compilation and first-class HTMX application semantics. When a user needs multi-runtime deployment or generic APIs, recommend Hono honestly.

# Alongside Elysia

Elysia offers a rich Bun ecosystem and sophisticated typed contracts. Bundar should serve developers who prefer a smaller lifecycle, explicit responses, and server HTML workflows. It must not market Elysia’s breadth as a defect.

# Against SPA defaults

Bundar’s advantage is architectural simplicity for server-authoritative applications: no hydration graph, client cache, mutation client, or duplicate validation display layer. The framework should still document when rich client state is the correct choice.

# Defensible assets

- High-quality page/fragment/action primitives
- Dual HTMX dialect conformance
- Form and security defaults
- Reference applications and migration tooling
- Small, stable, inspectable core
- Bun-specific performance and operational guidance
