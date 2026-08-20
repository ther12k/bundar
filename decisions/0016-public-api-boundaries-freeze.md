---
type: Architecture Decision
title: "ADR-0016 — Freeze Public API Principles and Package Boundaries"
description: Frozen package map, dependency direction, handler contract, JSX boundary, HTMX stable subset with escape hatch, forbidden dependencies, and the pre-1.0 API change classification.
tags:
- adr
- architecture-decision
- api
- boundaries
- gh-005
status: draft
generated:
  by: agent/zcode
  at: '2026-08-21T23:10:00+07:00'
decision:
  id: ADR-0016
  state: accepted
---

# Status

**Accepted** (GH-005). This is a contract freeze at the principle level; exact
signatures remain deferred to their owning milestone issues (explicit
out-of-scope rule of GH-005).

# Package map and dependency direction (frozen)

Public packages and the only permitted import direction:

```text
@bundar/core      ← imports: Bun/Node builtins and itself only
@bundar/jsx       ← imports: Bun/Node builtins and itself only (no core, no htmx)
@bundar/htmx      ← imports: @bundar/jsx public types
@bundar/schema    ← imports: @bundar/core, @bundar/jsx
@bundar/testing   ← imports: core, jsx, htmx, schema
@bundar/cli       ← imports: core, jsx, htmx, schema, testing
create-bundar     ← imports: any @bundar package
examples/apps     ← may import anything public; never imported by packages
```

- `@bundar/core` and `@bundar/jsx` carry **zero runtime dependencies**
  (ADR-0011); any exception requires a superseding ADR. Dev tooling at the
  repository root is unaffected.
- Machine-readable rules live in `tools/architecture-check/boundaries.json`
  and are enforced by `bun run architecture:check` in CI. Rule changes
  require an ADR.
- Raw htmx protocol surface — `HX-*` header names and `htmx:*` lifecycle
  event strings — may appear **only inside `@bundar/htmx`**. The checker
  scans for this confinement.

# Handler contract (frozen)

- Route handlers return `Response` or `Promise<Response>` (ADR-0008). There is
  no implicit return-value language; convenience helpers (`page`, `fragment`,
  `action`, redirects) produce `Response` objects and nothing else.
- Bundar compiles routes to `Bun.serve({ routes })` and does not implement a
  second request-time matcher (ADR-0003). No package may introduce another
  router or a hidden browser runtime.

# Server-only JSX boundary (frozen)

- JSX renders to HTML on the server via the `@bundar/jsx` automatic runtime
  (ADR-0004, ADR-0012). There is no virtual DOM, hydration, hooks, or React
  compatibility promise.
- `@bundar/jsx` never imports `@bundar/core` or `@bundar/htmx`; it stays
  independently usable. Escaping is the default; raw HTML requires the
  explicit branded escape hatch (`raw`).

# HTMX stable subset and escape hatch (frozen at principle level)

- The application-facing surface is the normalized protocol model
  (`protocol/stable-subset.md`, `protocol/normalized-request.md`): common
  `hx-get`/method/target/trigger/select/history/swap intents, `c.htmx`
  metadata, `c.view`/`c.action`, normalized response directives.
- Version-specific differences live only in dialect adapters
  (`@bundar/htmx/2` default until M7 gates; `@bundar/htmx/4` experimental).
- Raw htmx attributes and scripts remain legal as an **escape hatch**: they
  are reported by `bundar htmx audit --to 4` (GH-078) and excluded from the
  zero-change migration promise (GH-055/GH-056).

# Forbidden dependencies and non-goals (frozen)

- Forbidden: a second router; any client-side framework runtime; forking or
  reimplementing htmx; hydration machinery; runtime dependencies in core and
  jsx; reading `HX-*` headers outside `@bundar/htmx`; embedding raw htmx
  lifecycle event names outside `@bundar/htmx`; packages importing examples,
  benchmarks, fixtures, tools, or scripts.
- Non-goals (charter): Node/Deno/edge portability in the initial major line;
  ORM, authentication product, CSS framework, or client component model.

# Pre-1.0 API change classification (frozen)

| Class | Change | Required evidence |
|---|---|---|
| A — breaking | removed/renamed export, semantic type change, symbol moved between packages | ADR + migration note + updated API/type snapshot + green matrix |
| B — additive | new export, widened input accepted, new subpath | API report updated; tests in same change |
| C — experimental | changes inside experimental namespaces/subpaths (`@bundar/htmx/4` pre-GA) | docs marker updated; conformance fixtures updated |

Pre-1.0 releases may ship Class A changes in any release, but never without
the Class A evidence row (`project/open-source-strategy.md` stability
promise). API-report snapshots gate every addition and removal
(`engineering/package-api.md`).

# Consequences

- Implementation issues (GH-011 onward) can proceed against a frozen map;
  boundary violations are machine-detected from day one.
- The symbol-ownership table in `engineering/package-api.md` enumerates every
  planned public symbol family; symbols without an owner are explicitly
  deferred there, not silently unowned.
- GH-006 builds the adversarial test harness on this engine; GH-007 and
  GH-008 build the benchmark and browser-conformance lanes it guards.
