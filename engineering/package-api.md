---
type: Engineering Specification
title: Package API and Export Surface
description: Proposed public exports, internal boundaries, subpath policy, and API review mechanism.
tags:
- api
- packages
- exports
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Public packages

| Package | Core exports |
|---|---|
| `@bundar/core` | `Bundar`, route/module helpers, middleware, context types, `HttpError`, response helpers |
| `@bundar/jsx` | automatic JSX runtime, node types, `raw`, renderers, document helpers |
| `@bundar/htmx` | normalized types and portable helpers |
| `@bundar/htmx/2` | `htmx2` dialect factory |
| `@bundar/htmx/4` | `htmx4` dialect factory |
| `@bundar/schema` | Standard Schema middleware and error model |
| `@bundar/testing` | in-process client, assertions, dialect matrix helpers |
| `@bundar/cli` | programmatic CLI APIs where useful |
| `create-bundar` | project scaffolder executable |

# Export discipline

- Every public export is intentional and listed in package exports.
- Internal files use non-exported paths; users are not promised deep-import stability.
- Types and runtime values use the same import path where practical.
- API report snapshots gate additions/removals.
- Experimental exports carry a namespace or documentation marker and cannot silently become stable.

# Symbol ownership map (frozen by ADR-0016 / GH-005)

Every planned public symbol family has exactly one owning package. Exact
signatures are deliberately deferred to the owning milestone issues.

| Symbol family | Owning package | Owning issues |
|---|---|---|
| `Bundar` app class, app options | `@bundar/core` | GH-011–GH-015 |
| Route descriptors, module/group mounting | `@bundar/core` | GH-012–GH-015 |
| Request context (`Context`), params/query/cookie access | `@bundar/core` | GH-017, GH-019 |
| Middleware types and composition | `@bundar/core` | GH-018 |
| `HttpError`, error boundary types | `@bundar/core` | GH-020 |
| Not-found and lifecycle terminal behavior | `@bundar/core` | GH-022 |
| Response helpers (`page`/`fragment`/`action`, redirects) | `@bundar/core` | GH-021 |
| Body/form parsing primitives (bounded) | `@bundar/core` | GH-057, GH-067 |
| Automatic JSX runtime, node/child types, `raw` trust boundary | `@bundar/jsx` | GH-026–GH-031 |
| Attribute/class/style/boolean serialization | `@bundar/jsx` | GH-028 |
| Document/doctype/head/void helpers | `@bundar/jsx` | GH-032 |
| `renderToString`, `renderToStream`, JSX response integration | `@bundar/jsx` | GH-033–GH-034 |
| Typed common HTMX attribute types (runtime-free) | `@bundar/jsx` | GH-035 |
| Normalized protocol types and portable helpers | `@bundar/htmx` | GH-039–GH-042 |
| `htmx2` dialect factory | `@bundar/htmx/2` | GH-043 |
| `htmx4` dialect factory | `@bundar/htmx/4` | GH-044 |
| Asset registry, event mapping, inheritance helpers, negotiation, cache policy, update intents | `@bundar/htmx` | GH-045–GH-052 |
| Standard Schema adapter, validation result model | `@bundar/schema` | GH-058–GH-059 |
| CSRF/cookie/session/upload/CSP security primitives | `@bundar/core` (interfaces) + middleware | GH-061–GH-067 |
| In-process test client, dialect matrix helpers | `@bundar/testing` | GH-074 |
| CLI commands (`dev`, manifests, `htmx audit`) | `@bundar/cli` | GH-070–GH-073, GH-078 |
| Scaffolder executable | `create-bundar` | GH-071 |

Deliberately deferred (no owning package yet): none. Any future symbol
without a row here must either gain an owning-package row via ADR-0016
amendment or be rejected.

# Landed surface (progress notes)

- GH-012: `@bundar/core` exports the typed route model from
  `packages/core/src/routing/types.ts` — `HTTP_METHODS`/`isHttpMethod`,
  `HttpMethod`, `RouteParams`, `ValidateRoutePath` (+ `RoutePathError`),
  `RouteHandler`, `RouteMethods` (+ `DuplicateMethodError`), `RouteMetadata`,
  `Simplify`, `HandlerRoute`, `StaticRoute`, `RouteDescriptor`. Handlers
  return `Response | Promise<Response>` only.
- GH-013: `@bundar/core` exports `App`, `RouteModule`, `RouteManifest`,
  `defineModule`, and immutable manifest helpers. Builder registration is
  deterministic and does not call `Bun.serve`; path validation/conflicts and
  native compilation remain GH-014–GH-015, context/middleware/errors remain
  GH-017–GH-022.

# Pre-1.0 API change classification

Changes are classified A (breaking), B (additive), or C (experimental) per
ADR-0016; each class has required evidence. Class A changes may ship in any
pre-1.0 release but never without an ADR, migration note, and updated
snapshots.
