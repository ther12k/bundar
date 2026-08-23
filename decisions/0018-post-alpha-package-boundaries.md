---
type: Architecture Decision
title: ADR-0018 — Freeze the Post-Alpha Package Dependency Graph
description: Final pre-beta package map, allowed dependency matrix, progressive-form ownership, transitional exceptions, and the compatibility policy for boundary moves.
tags:
- adr
- architecture-decision
- packages
- boundaries
status: accepted
updated: '2026-08-23'
decision:
  id: ADR-0018
  state: accepted
supersedes:
- ADR-0016 (package map section only)
amends:
- ADR-0013
---

# Status

**Accepted** — the post-alpha boundary reset (M8.1). Supersedes the package
map inside ADR-0016; ADR-0013's subpath-export decision remains in force.

# Context

The alpha shipped eight workspace packages. Source inspection during the
post-alpha review (BR-001 baseline, `f8bdd86`) found the intended
architecture — HTMX as a protocol adapter — drifting before any public npm
consumer exists:

- `@bundar/htmx` depends on `@bundar/core` and `@bundar/schema` and its
  `form-action.ts` orchestrates form parsing/validation/response composition,
  duplicating workflow that belongs to a framework-neutral forms owner.
- `@bundar/schema` imports `parseForm` from core (`sources.ts`), coupling the
  validation adapter to the HTTP kernel.
- No machine-readable allowed graph exists; documentation-only boundaries
  already drifted once (ADR-0013 → alpha manifests).

Publication makes every one of these edges a public compatibility promise.
This is the last cheap moment to correct ownership.

# Decision

## 1. Package map (public packages)

| Package | Owns |
| --- | --- |
| `@bundar/core` | Request/Response kernel: routes, context, middleware, body parsing, cookies, budgets |
| `@bundar/jsx` | Server-only HTML renderer: escaping, components, documents, streaming |
| `@bundar/htmx` | Protocol adapter: request metadata, directives, dialects (2/4), assets, views, updates, navigation |
| `@bundar/forms` | Progressive-form workflow: bounded parsing orchestration, retained values, field errors, action composition, validation port |
| `@bundar/schema` | Standard Schema integration adapters and structured results — no HTTP behavior |
| `@bundar/security` | Sessions, flash, CSRF, origin policy, headers/CSP, uploads, request budgets |
| `@bundar/testing` | Framework-aware in-process test clients for all lanes |
| `@bundar/cli` | Deterministic tooling: dev server, generators, audits, scaffolding |

## 2. Allowed dependency matrix (acyclic; target state)

| ↓ depends on → | core | jsx | htmx | forms | schema | security | testing | cli |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **core** | — | – | – | – | – | – | – | – |
| **jsx** | – | — | – | – | – | – | – | – |
| **htmx** | ✗ | ✔ | — | ✗ | ✗ | ✗ | ✗ | ✗ |
| **forms** | ✔ | ✗ | ✗* | — | ✔ | ✗ | ✗ | ✗ |
| **schema** | ✗ | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ |
| **security** | ✔ | ✗ | ✗ | ✗ | ✗ | — | ✗ | ✗ |
| **testing** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✗ |
| **cli** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✗* | — |

`@bundar/htmx` is protocol-pure: it may use standard `Request`/`Response`
and `@bundar/jsx`, never the kernel or schema/forms. `✗*`: the htmx response
composition consumed by form actions is exposed as directive/view APIs that
`@bundar/forms` composes — forms imports nothing from htmx; applications
combine them.

Tooling carve-out: `create-bundar` (and `@bundar/cli`) may depend on
`@bundar/testing` because the scaffolder embeds generated application test
code that imports it; this does not make testing a runtime dependency of any
framework package.

## 3. Ownership of progressive-form orchestration

**`@bundar/forms` owns it.**

- `runFormAction` and the action/result types live in `@bundar/forms`.
- Bounded parse + Standard Schema validation composition lives in
  `@bundar/forms`; the raw parser primitives stay in `@bundar/core`.
- The structured validation result model moves to `@bundar/schema` staying
  HTTP-free; `@bundar/forms` adapts between them.
- HTMX response composition stays in `@bundar/htmx` (directives/views);
  `runFormAction` receives an injected response composer so forms never
  imports htmx.

## 4. Transitional exceptions (time-boxed, enforced by BR-012)

| Edge | Reason | Removed by |
| --- | --- | --- |
| htmx → core | `form-action.ts` still orchestrates core parsing | BR-015 |
| htmx → schema | field-error/result types not yet relocated | BR-016 |
| schema → core | `sources.ts` parse adapters still kernel-bound | BR-016 |

Every exception cites this ADR and expires when its listed task closes;
BR-012 fails the build if an exception outlives its task.

## 5. Compatibility policy for pre-1.0 boundary moves

Per ADR-0014 profiles: within the pre-1.0 line a moved public export keeps a
deprecated compatibility re-export from its old location for at least one
release cycle (BR-018 implements these), removals are release-notes events,
and no move may introduce a cycle into the matrix above.

## 6. Rejected alternatives

- **Accept the htmx→core/schema coupling**: bakes accidental history into
  public API forever and forces protocol consumers to install the kernel.
- **Move everything into core**: recreates the monolith ADR-0013 rejected;
  destroys tree-shaking and dialect isolation.
- **Split every tiny helper into its own package**: fragmenting internal
  helpers multiplies release/publish surface without consumer value; the
  matrix caps the graph at eight packages plus future explicitly-ADR'd ones.

# Consequences

BR-012 enforces manifest + source edges against §2 with §4 exceptions;
BR-013–BR-017 implement the moves toward the target state; generated API
docs must reflect the frozen map after each landing.
