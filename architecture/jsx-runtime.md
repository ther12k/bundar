---
type: Architecture Specification
title: Server-Only JSX Runtime
description: JSX node model, escaping, attributes, components, async rendering, raw HTML, and prohibited client-runtime behavior.
tags:
- jsx
- tsx
- rendering
- security
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
---

# Compiler configuration

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@bundar/jsx"
  }
}
```

# Node model

The runtime accepts strings, numbers, booleans/null as empty nodes, arrays/iterables, fragments, synchronous components, asynchronous components, and explicit raw HTML values. Components are ordinary functions; they have no lifecycle or browser identity.

# Safety

- Text escapes `&`, `<`, and `>`.
- Attribute values additionally escape quotes.
- Attribute names come from intrinsic typings or validated spread handling.
- `raw()` creates a branded unsafe value and is forbidden for untrusted input.
- Event-handler string attributes and URL-bearing attributes are documented as elevated-risk escapes.

# HTML semantics

Use HTML names (`class`, `for`) while optionally accepting well-documented aliases. Boolean attributes render according to HTML semantics. `style` may accept a string or a typed object with deterministic kebab-case conversion. `data-*`, `aria-*`, and `hx-*` attributes remain extensible.

# Rendering APIs

```ts
renderToString(node): Promise<string>
renderToStream(node, options): ReadableStream<Uint8Array>
html(node, init): Response
raw(trustedHtml): RawHtml
```

# Explicit exclusions

No virtual DOM, reconciliation, browser hooks, `useState`, hydration markers, synthetic event system, or React component compatibility contract.
