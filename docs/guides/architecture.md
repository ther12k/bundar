# Architecture guide

How Bundar is put together, why the boundaries are frozen, and — just as
importantly — when you should NOT use it.

## Packages and the frozen boundaries

### The form-action split

Validated form workflows are split across two packages on purpose:

```
@bundar/forms   (neutral workflow)
  parse → validate → retain safe values → execute run()
  → resolve the domain result → build the fragment
  → transaction + cancellation semantics → neutral outcome

            ↓  FormResponseAdapter (the delivery boundary)

@bundar/htmx    (HTTP/HTMX delivery)
  ordinary/enhanced detection, Post/Redirect/Get, fragment delivery,
  Vary, cache policy, HX directives, retarget/reswap, invalid documents
```

`@bundar/forms` does not know about HTMX headers or dialects; `@bundar/htmx`
adapts the neutral workflow into HTTP/HTMX delivery. Application code sits
on top with two helpers:

- `defineFormAction()` — an inference-friendly definition helper (identity
  at runtime): Input flows from the schema, `Result` from `run()`.
- `createFormActions({ dialect })` — binds the application's delivery
  policy once; `forms.handle()` returns the composed Response, and
  `forms.execute()` exposes the discriminated outcome.

The facade is an additive adapter over the existing executor — not a
controller, service container, or new runtime layer.


| Package | Depends on | Role |
| --- | --- | --- |
| `@bundar/core` | nothing | App, routing→Bun.serve route tables, Context, middleware onion, error boundary, request budgets |
| `@bundar/jsx` | nothing | Server-only JSX rendering, streaming, the doctype/document skeleton |
| `@bundar/schema` | core, jsx | Standard Schema adapter, field-error models with redaction |
| `@bundar/security` | core | CSRF, sessions, flash, security headers/CSP |
| `@bundar/htmx` | core, jsx, schema | Dialect adapters, negotiation, actions, OOB intents, assets |
| `@bundar/testing` | core, jsx, htmx, schema | In-process test client; never imported by production packages |
| `@bundar/cli` | core, jsx, htmx, schema, testing | `dev`, `routes`, `htmx-audit` commands |

These edges are not conventions — they are machine-enforced frozen rules
(`bun run architecture:check`, ADR-0016). Two invariants follow:

1. **Raw htmx protocol strings (`HX-*`, `htmx:*`) live only inside
   @bundar/htmx.** Application code uses neutral helpers
   (`buildHtmxRequestHeaders`, `serializeUpdates`, `errorViewResponse`);
   the audit tool and the boundary harness both enforce it.
2. **core and jsx have zero runtime dependencies.** No React, no
   hydration runtime, no hidden supply chain.

## The request pipeline

```
Bun.serve (native route tables, compiled once at startup)
  └─ per-request Context
      └─ middleware onion (startup-composed)
          └─ handler → JSX tree → Response (sync or streamed)
```

- Route matching is Bun's own (the native route table); the compiler
  only composes middleware chains once at compile time.
- Errors classify at one boundary: expected `HttpError`s keep
  their public envelope; unexpected failures are opaque 500s in
  production — messages and stacks leak only in development.
- Request budgets bound body size and deadline; composite
  abort signals classify client disconnects apart from failures.

## Server-only JSX

JSX renders to HTML strings/streams on the server — there is no VDOM,
no hydration, no client runtime. Streaming uses async
generators with real backpressure; RCDATA/script escaping is
grammar-aware. If you need rich client state, Bundar is the
wrong tool for that part of your app — keep those islands in something
else and link them.

## Progressive enhancement as architecture

- **Negotiation**: ordinary → document, enhanced → fragment,
  boosted/history-restore → document.
- **Actions**: one result → 303 PRG for ordinary browsers,
  fragment + directives for enhanced.
- **Form actions**: parse → validate (Standard Schema) → act,
  with identical validation for both worlds.
- **OOB updates**: normalized intents — never hand-written
  swap markup.
- **Errors**: page/fragment negotiation with auth failures
  never leaking protected content.

## Comparison guidance

**Raw Bun.serve** — the fastest path and zero abstraction. Choose it
when your app is small or you genuinely want to own everything. Bundar
compiles to the same native route tables, so you keep Bun's perf and
add negotiation, validation, security middleware, and tooling.

**Hono** — a mature, multi-runtime router with a large ecosystem.
Choose it when you need runtimes other than Bun, or its middleware
ecosystem. Bundar differs on purpose: HTML-first progressive
enhancement, server-only JSX, htmx dialect adapters, and no-JS fallback
as tested main paths rather than an afterthought.

**Elysia** — Bun-native with strong typing and an Eden client. Choose
it for JSON-API-first services with end-to-end typed clients. Bundar is
HTML-first: the "client" is the browser itself, enhanced by htmx, with
no client bundle.

**When Bundar is NOT appropriate**

- You need a SPA/React/Vue client — Bundar deliberately has no client
  runtime and no hydration.
- You need non-Bun runtimes (Node, Deno, workers, edge).
- You need heavy client-side state or offline-first UX.
- You want CSS-in-JS / component-level client styling systems.

## The dialect adapters (htmx 2 ↔ 4)

Versions are isolated behind adapters pinned to exact releases with
SHA-256-verified assets: htmx **2.0.10** (stable, default) and htmx
**4.0.0-beta6** (⚠️ experimental — no GA compatibility claim; GA
revalidation is M7). Application code stays dialect-neutral; switching
is a bootstrap-only change — see the
[migration guide](htmx-migration.md) for the audited procedure.

## Deeper reading

- [API reference](../api/README.md) — generated from the live surface.
- [Compatibility matrix](../compatibility/matrix.md) — feature-by-feature
  dialect comparison.
- Delivery gates in `delivery/gates/` — the evidence trail per milestone.
