---
type: Project Charter
title: Bundar Project Charter
description: Purpose, product boundary, stakeholders, outcomes, constraints, and governance for Bundar.
tags:
- project
- charter
- governance
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

# Purpose

Bundar exists to make server-driven TypeScript applications on Bun feel complete without introducing a SPA runtime. It combines Hono-like route ergonomics, a server-only JSX renderer, form-first application primitives, and explicit htmx protocol support while preserving native `Request`, `Response`, and `Bun.serve` behavior.

# Product statement

> Bundar is a Bun-native hypermedia framework for building full-stack TypeScript applications with server-rendered JSX and htmx, without hydration.

# Primary outcomes

- A developer can create a production-shaped HTML application from a small Bun project.
- Full-page navigation, htmx fragments, validated forms, redirects, flash messages, and multi-region updates use one coherent response model.
- Raw Bun remains visible and reachable; Bundar does not hide the web platform.
- The same application source runs against htmx 2 and htmx 4 through a dialect switch.
- Core packages stay small, inspectable, benchmarked, and dependency-light.

# Stakeholders

- Application developers building admin, school, logistics, CRM, ERP, scheduling, approval, and CRUD-heavy systems.
- Framework maintainers responsible for API stability and protocol conformance.
- Plugin authors integrating validation, sessions, observability, styling, and data access.
- Security reviewers validating escaping, CSRF, cookies, headers, upload handling, and dependency provenance.

# Constraints

- Bun 1.4 or newer is the initial runtime baseline.
- Official htmx is a user-visible dependency; its major version is selected explicitly.
- The initial framework is not runtime-portable and does not target Node, Deno, or edge isolates.
- The initial release does not provide a client component model, hydration, ORM, authentication product, or CSS framework.
- Public namespace and trademark availability remain release gates.

# Governance

Architecture changes require ADRs. Compatibility claims require conformance evidence. Performance targets are budgets, not marketing claims, until reproduced in CI. Security-sensitive changes require dedicated tests and review. Milestone gates in [release gates](../engineering/release-gates.md) control progression.
