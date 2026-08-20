---
type: Reference
title: Hono JSX and Ergonomic Reference
description: What Bundar learns from Hono JSX and where its product boundary differs.
tags:
- hono
- jsx
- reference
status: stable
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-10-01'
sources:
- id: hono-jsx
  resource: https://hono.dev/docs/guides/jsx
  title: Hono JSX guide
  author: team:hono
  last_modified: '2026-08-12'
---

# Useful reference

Hono demonstrates a concise route API and JSX import-source setup that works well across runtimes. Bundar should match that level of readability for common routes.

# Deliberate differences

Bundar is Bun-only, compiles to Bun’s route table, keeps JSX server-only, and treats HTMX page/fragment/action behavior as a product core. It should not copy Hono’s multi-runtime internals or client component model.
