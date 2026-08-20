---
type: Scope Definition
title: Scope and Non-Goals
description: Initial release boundary, included capabilities, extensions, escape hatches, and deliberate exclusions.
tags:
- scope
- non-goals
- release
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Initial major-line scope

- Bun-native application and route builder compiled to `Bun.serve` routes.
- Server-only JSX runtime with escaping, fragments, async components, and streaming.
- Page, fragment, and action response helpers.
- htmx 2 stable adapter and htmx 4 adapter with explicit maturity status.
- Typed common HTMX attributes, normalized request metadata, and response directives.
- Form parsing, optional Standard Schema validation, field-error rendering, CSRF, secure cookies, upload limits, and security headers.
- CLI scaffolding, route manifest, test client, examples, documentation, and migration audit.
- Browser conformance and benchmark suites.

# Optional packages, not core assumptions

Validation adapters, sessions, SSE helpers, observability adapters, Tailwind integration, database libraries, and authentication libraries may exist as separate packages or examples.

# Non-goals for v0.x

- Node, Deno, Cloudflare, or WinterCG runtime portability.
- React API compatibility, client JSX, virtual DOM, hydration, hooks, signals, or browser component lifecycle.
- A proprietary replacement for htmx.
- Built-in ORM, migrations, database abstraction, identity product, queue, email service, or UI component library.
- Deep end-to-end RPC inference or OpenAPI as a mandatory contract.
- Automatic conversion of arbitrary handler return values.
- A custom CSS framework or mandatory Tailwind dependency.
- Hosting platform lock-in.

# Escape hatches

Developers may return raw `Response`, use `Bun.serve` options, write raw `hx-*` attributes, include custom scripts, or mount specialized handlers. Those paths remain supported at the web-platform level but may fall outside Bundar’s cross-dialect and security guarantees.
