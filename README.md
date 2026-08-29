---
type: Project README
title: Bundar
description: Bun-native, HTML-first TypeScript framework with server-only JSX, progressive forms, and versioned htmx dialect adapters.
tags:
  - bundar
  - bun
  - typescript
  - jsx
  - tsx
  - htmx
  - hypermedia
status: alpha
updated: '2026-08-23'
---

# Bundar

**HTML comes full circle.**

[![CI](https://github.com/ther12k/bundar/actions/workflows/ci.yml/badge.svg)](https://github.com/ther12k/bundar/actions/workflows/ci.yml)
[![Docs](https://github.com/ther12k/bundar/actions/workflows/docs.yml/badge.svg)](https://github.com/ther12k/bundar/actions/workflows/docs.yml)
[![Release](https://img.shields.io/github/v/release/ther12k/bundar?include_prereleases&label=release)](https://github.com/ther12k/bundar/releases)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.4.0-black?logo=bun)](https://bun.com)
[![License](https://img.shields.io/github/license/ther12k/bundar)](LICENSE)

**Bundar is a Bun-native, HTML-first TypeScript framework for building server-rendered applications with JSX/TSX and official htmx.** One route can serve a complete document to an ordinary browser and an HTML fragment to an enhanced request. Forms use the same handlers and validation rules with or without JavaScript.

> [!WARNING]
> **Bundar is pre-1.0.** [`v0.1.0-alpha.1`](https://github.com/ther12k/bundar/releases/tag/v0.1.0-alpha.1) is available as a GitHub pre-release, but the `@bundar/*` packages have **not yet been published to npm**. Registry publication remains guarded and pending maintainer credentials. Expect breaking changes, pin exact releases, and do not treat the experimental htmx 4 adapter as GA support.

## Why Bundar

Bundar is not trying to become a smaller NestJS, a React meta-framework, or another cross-runtime router. It focuses on a narrower application model:

```text
browser request
  → Bun.serve native route
  → Bundar middleware and handler
  → server-only JSX
  → complete document or HTML fragment
  → ordinary navigation or htmx swap
```

The framework keeps the browser and server aligned around HTML:

- **Bun owns the runtime.** Bundar compiles registered routes into Bun's native route table instead of adding a second router.
- **JSX renders HTML on the server.** There is no React dependency, virtual DOM, hydration, browser hook system, or mandatory client bundle.
- **Progressive enhancement is the default.** Plain links and forms remain functional; htmx improves them with fragment swaps, history, and multi-region updates.
- **HTMX versions stay behind adapters.** Application code uses one normalized Bundar model while the selected dialect owns version-specific wire behavior.

Bundar is aimed primarily at admin panels, internal tools, approval workflows, dashboards, CRUD-heavy products, scheduling systems, school systems, and other server-authoritative business applications.

## Status at a glance

| Area | Current status |
| --- | --- |
| Release | `v0.1.0-alpha.1` GitHub pre-release; M0–M6 release gates passed |
| Runtime | Bun `>=1.4.0`; Bun-only, with no Node/Deno/edge runtime adapter |
| Stable hypermedia dialect | htmx `2.0.10`, pinned and selected by default |
| Experimental dialect | htmx `4.0.0-beta6`; selectable, never default, and not a GA claim |
| htmx 4 GA work | M7 is explicitly deferred because no official GA release exists; reopen GH-089–GH-096 when upstream GA ships |
| JavaScript-disabled flows | Core form workflows use Post/Redirect/Get and are tested without htmx headers |
| Browser evidence | Chrome for Testing lanes are covered; other browser engines remain unclaimed in this alpha |
| Registry publication | Pending maintainer credentials; source packages still use private workspace manifests |
| Post-alpha planning | The post-alpha review and beta-readiness bundle are complete (~85 microtasks, M8 chain); the path to beta runs through correctness, package-boundary, production-security, conformance, and guarded-publication tasks behind a single evidence-backed GO/NO-GO gate |
| License | MIT |

See the [alpha release notes](docs/release-notes/alpha.md), [compatibility matrix](docs/compatibility/matrix.md), and [release gate](delivery/gates/alpha.md) for the evidence behind these statements.

## What is implemented

- Typed route registration, groups, modules, native route compilation, startup-composed middleware, request context, response helpers, and error boundaries
- Secure server-only JSX/TSX with escaping, fragments, functional and async components, document rendering, streaming, backpressure, and typed `hx-*` attributes
- Full-page/fragment negotiation with correct `Vary` handling and fail-safe cache defaults
- Progressive actions with ordinary `303` redirects and enhanced fragment responses from the same mutation
- Standard Schema validation for forms, JSON, queries, parameters, and headers without bundling a validator
- Normalized out-of-band and multi-region update intents
- Pinned local htmx assets, request normalization, response directives, navigation helpers, lifecycle-event mapping, and extension diagnostics
- Sessions, flash data, CSRF protection, origin checks, security headers/CSP, upload policies, and request budgets
- Typed URL generation with source-drift checks
- In-process application testing, dual-dialect browser conformance, scaffolding, migration auditing, generated API docs, and reference applications

## Run the canonical starter

Until registry publication is complete, run Bundar from this monorepo:

```bash
git clone https://github.com/ther12k/bundar.git
cd bundar
bun install --frozen-lockfile
bun run preflight

cd templates/minimal
bun run dev
```

Open `http://localhost:3000`. The starter serves the htmx asset locally, renders full documents for ordinary requests, returns fragments for enhanced requests, and submits the same validated form through either Post/Redirect/Get or htmx.

To exercise the implemented scaffolder inside the workspace:

```bash
cd /path/to/bundar
bun create-bundar/src/bin.ts examples/my-app --dialect htmx2
cd examples/my-app
bun install
bun run dev
```

The intended post-publication command is `bunx create-bundar`, but the README deliberately does not present an unpublished registry command as currently available.

## A small Bundar application

Configure TypeScript to use the Bundar JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@bundar/jsx"
  }
}
```

Then define a Bun-native application with one route serving both representations:

```tsx
import { App, ErrorBoundary, type Context } from "@bundar/core";
import { document, type JSXChild } from "@bundar/jsx";
import {
  createHtmxAssetHandler,
  HtmxScript,
  view,
} from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";

const app = new App();
const dialect = htmx2;
const serveHtmx = createHtmxAssetHandler({ dialect });

function TodoList(): JSXChild {
  return (
    <section id="todos">
      <h1>Todos</h1>
      <ul>
        <li>Ship HTML, not hydration.</li>
      </ul>
      <button
        hx-get="/todos"
        hx-target="#todos"
        hx-swap="outerHTML"
      >
        Refresh
      </button>
    </section>
  );
}

app.get(
  "/assets/htmx.min.js",
  (context: Context) => serveHtmx(context.request),
  { name: "asset-htmx" },
);

app.get(
  "/todos",
  (context: Context) =>
    view(
      context.request,
      {
        fragment: () => <TodoList />,
        page: () =>
          document({
            lang: "en",
            title: "Todos",
            children: (
              <>
                <main>
                  <TodoList />
                </main>
                <HtmxScript
                  dialect={dialect}
                  src="/assets/htmx.min.js"
                  integrity={null}
                />
              </>
            ),
          }),
      },
      { dialect },
    ),
  { name: "todos" },
);

const boundary = new ErrorBoundary({
  development: process.env.NODE_ENV !== "production",
});

const server = Bun.serve({
  ...app.compile(),
  port: Number(process.env.PORT ?? 3000),
  error: (error) => boundary.capture(error),
});

console.log(`Bundar running on http://localhost:${server.port}/todos`);
```

`integrity={null}` matches the shipped layouts: the asset is served same-origin from the pinned vendor file, and SRI + `crossorigin` on a same-origin script is the combination the browser lanes showed to be blocked (GH-055).

For a normal `GET /todos`, `view()` returns a complete document. For a standard enhanced request, it returns only `#todos`. Boosted navigation and history restoration receive an installable document rather than an unsafe fragment. The response automatically varies on the headers used by representation negotiation.

The complete starter also demonstrates validated mutations, typed URLs, tests, and a no-JavaScript fallback. See [`templates/minimal`](templates/minimal/README.md).

## Progressive form actions

Bundar treats HTML forms as a primary application interface rather than a wrapper around a JSON API:

```text
ordinary browser
  POST form → validate → mutate → 303 Location → complete document

htmx browser
  POST form → validate → mutate → HTML fragment + response directives
```

`defineFormAction()` and `createFormActions()` provide the preferred application-level form workflow. They separate validated business execution in `run()` from rendering in `success.fragment()`, while preserving ordinary Post/Redirect/Get and enhanced fragment responses. `runFormAction()` remains available as the lower-level compatibility surface.

Read the [getting-started guide](docs/getting-started.md), [validation guide](docs/guides/validation.md), and [Todo walkthrough](docs/examples/todo.md) for the complete pattern.

## Switching htmx dialects

The canonical starter keeps the dialect decision in one bootstrap file:

```diff
-import { htmx2 } from "@bundar/htmx/2";
-export const dialect = htmx2;
+import { htmx4Experimental } from "@bundar/htmx/4";
+export const dialect = htmx4Experimental;
```

Route handlers, domain services, JSX components, validation, and business workflows should not change. Before trying the experimental adapter, audit and test both lanes:

```bash
bun packages/cli/src/bin.ts htmx-audit examples/my-app/src
bun run test:browser:htmx2
bun run test:browser:htmx4
bun run test:dual-app
```

The current htmx 4 profile is pinned to `4.0.0-beta6`. The M7 GA chain is **closed as externally blocked, not completed**. When official htmx 4 GA ships, Bundar will reopen the recorded source snapshot, contract diff, adapter update, regression, unchanged-application, migration, default-dialect, and stable-release gates. See the [migration guide](docs/guides/htmx-migration.md) and [M7 descope record](delivery/descopes/m7-htmx4-ga.md).

## Packages

| Package | Responsibility |
| --- | --- |
| [`@bundar/core`](docs/api/core.md) | Bun-native HTTP application kernel, routing, context, middleware, responses, errors, forms, cookies, and typed routes |
| [`@bundar/jsx`](docs/api/jsx.md) | Secure server-only JSX/TSX runtime, document and fragment rendering, and streaming |
| [`@bundar/htmx`](docs/api/htmx.md) | Version-neutral hypermedia model, htmx 2/4 adapters, assets, views, actions, updates, events, and navigation |
| [`@bundar/schema`](docs/api/schema.md) | Standard Schema adapters and structured validation results; no validator bundled |
| [`@bundar/forms`](docs/api/forms.md) | Progressive form parsing orchestration, validation result adaptation, and field error rendering |
| [`@bundar/security`](docs/api/security.md) | Sessions, flash, CSRF, origin policy, headers/CSP, uploads, and request budgets |
| [`@bundar/testing`](docs/api/testing.md) | In-process clients and helpers for ordinary and enhanced request flows |
| [`@bundar/cli`](docs/api/cli.md) | Development server, route generation/checking, environment diagnostics, and HTMX migration auditing |
| [`create-bundar`](create-bundar/README.md) | Minimal project scaffolding with stable or explicitly experimental dialect selection |

The generated [API reference](docs/api/README.md) is checked for export drift in CI.

## Reference applications

| Application | Demonstrates |
| --- | --- |
| [Minimal starter](templates/minimal/README.md) | Native routing, page/fragment negotiation, local htmx asset, progressive validation, typed URLs, and app-owned bootstrap |
| [Todo](docs/examples/todo.md) | Create/edit/toggle/delete, filters, counts, flash, CSRF/session composition, normalized OOB updates, PRG, and unchanged-source dialect switching |
| [Admin CRUD](docs/examples/admin.md) | Server-side roles, search/filter/pagination, inline forms, optimistic-concurrency conflicts, protected deletes, audit feed, and multi-region updates |

The reference stores and fixture logins are intentionally replaceable test seams. Production applications must provide durable sessions, real authentication, and persistent repositories.

## Development

Bundar requires Bun `>=1.4.0` and uses Bun for package management, tests, building, browser harnesses, and release tooling.

```bash
bun install --frozen-lockfile
bun run preflight
bun run format:check
bun run lint
bun run typecheck
bun test
bun run build
bun run docs:check
```

Useful targeted checks:

```bash
bun run test:template
bun run test:scaffold
bun run test:example
bun run test:e2e:release
bun run bench:regression
bun run ci:release
```

`ci:release` is the fail-closed release battery. It includes the milestone gates, documentation drift checks, scaffold/template journeys, reference-application lanes, dual-dialect conformance, security audits, performance budgets, package inspection, SBOM/provenance, reproducibility, and publication dry runs.

## Design boundaries

Bundar intentionally does **not** put the following in its core model:

- React compatibility, hydration, a virtual DOM, or browser state hooks
- A custom HTMX fork or hidden replacements for ordinary `hx-*` attributes
- A second request router above Bun
- Multi-runtime Node, Deno, or edge adapters
- A mandatory Rust toolchain or native dependency
- A dependency-injection container, ORM, queue, scheduler, or authentication product
- Automatic JSON API/client generation as the primary browser architecture

Applications may integrate those concerns through normal TypeScript modules and explicit service boundaries, but Bundar remains focused on Bun, server HTML, progressive forms, and hypermedia interaction.

## Documentation

Start here:

1. [Getting started](docs/getting-started.md)
2. [Architecture guide](docs/guides/architecture.md)
3. [API reference](docs/api/README.md)
4. [HTMX compatibility matrix](docs/compatibility/matrix.md)
5. [HTMX migration guide](docs/guides/htmx-migration.md)
6. [Security guide](docs/guides/security.md)
7. [Sessions guide](docs/guides/sessions.md)
8. [Uploads guide](docs/guides/uploads.md)
9. [Accessibility guide](docs/guides/accessibility.md)
10. [Alpha performance report](docs/performance/alpha.md)
11. [Alpha release notes](docs/release-notes/alpha.md)

The repository also retains its OKF architecture corpus, ADRs, issue dependency model, gate records, and per-issue evidence. These are engineering records; the README is now the implementation landing page rather than the old design-bundle handoff.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. The repository uses explicit issue dependencies, package-boundary checks, evidence-backed milestone gates, and generated documentation drift checks.

Please report vulnerabilities according to [SECURITY.md](SECURITY.md), not through a public issue. General support expectations are documented in [SUPPORT.md](SUPPORT.md).

## License

Bundar is licensed under the [MIT License](LICENSE).
