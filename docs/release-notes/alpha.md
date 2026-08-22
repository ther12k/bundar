# Bundar v0.1.0-alpha.1 release notes

> **This is an alpha.** Everything here is implemented and evidenced —
> and everything here may change before 1.0. No beta feature is
> described as stable or GA anywhere in this release.

## What Bundar is

A Bun-native, HTML-first TypeScript framework: server-only JSX (no
React, no hydration, no client runtime), official htmx behind pinned
dialect adapters, and progressive enhancement as the tested default —
forms work without JavaScript and get better with it.

## Implemented and evidenced

- **Routing & runtime** — App registration compiled to Bun.serve native
  route tables; startup-composed middleware; typed URL builders with
  drift checks (`routes:check`). Evidence:
  [M1 gate](../../delivery/gates/m1.md).
- **Server JSX & streaming** — sync/async renderers with grammar-aware
  escaping, streaming with backpressure. Evidence:
  [M2 gate](../../delivery/gates/m2.md).
- **Dialect adapters** — htmx **2.0.10** (stable, the default) and
  htmx **4.0.0-beta6** (⚠️ **experimental — no GA compatibility
  claim**), pinned with SHA-256-verified local assets; application code
  stays dialect-neutral (machine-enforced). Evidence:
  [M3 gate](../../delivery/gates/m3.md),
  [compatibility matrix](../compatibility/matrix.md).
- **Forms & security** — validated form actions (Standard Schema),
  sessions, session-bound CSRF, flash, security headers/CSP, upload
  policies, request budgets, and page/fragment error negotiation.
  Evidence: [M4 gate](../../delivery/gates/m4.md).
- **Tooling & docs** — `bundar dev` (hot reload), `bundar routes`,
  `bundar htmx-audit` (migration linter), `create-bundar` scaffolding,
  the in-process test client, reference apps (Todo, Admin CRUD), the
  generated API reference, runnable doc snippets, and the guides.
  Evidence: [M5 gate](../../delivery/gates/m5.md).
- **Release evidence** — 19-suite dual-dialect E2E matrix
  ([release-matrix.json](https://github.com/ther12k/bundar/blob/main/artifacts/conformance/release-matrix.json)),
  environment-bound performance results with regression budgets
  ([performance doc](../performance/alpha.md)), package audit + SBOM +
  checksums + reproducibility
  ([artifacts](https://github.com/ther12k/bundar/tree/main/artifacts)).

## Compatibility statement

| Component | Status |
| --- | --- |
| Bun | **>= 1.4.0 required** (Bun-native APIs; no Node/Deno/edge support) |
| htmx 2.0.10 | Stable, the default dialect, pinned local asset |
| htmx 4.0.0-beta6 | ⚠️ **Experimental** — selectable, never default, no GA claim; 6 classified deviations ([matrix](../compatibility/matrix.md)) |
| No-JavaScript | Every core flow works via Post/Redirect/Get — tested in every lane ([release matrix](https://github.com/ther12k/bundar/blob/main/artifacts/conformance/release-matrix.json)) |
| Browsers | Chrome for Testing lanes (152.x) in the E2E matrix; other engines untested until htmx 4 GA evidence (M7) |
| TypeScript | 6.0.3 (devDependency; strict consumers supported — proven in the packed cleanroom) |
| Node/npm installs | Alpha packages are Bun-targeted; no Node runtime support |

Every claim above links to executed evidence (gates, artifacts, or the
generated docs). Benchmarks: methodology and honest results live in the
[performance doc](../performance/alpha.md) — measured on one
environment, no requests-per-second leadership claims.

## Known limitations

- **API stability**: pre-1.0 — breaking changes may land in any 0.x
  release; pin exact versions and expect migration notes per release.
- **htmx 4**: beta-only support; GA revalidation is a mandatory future
  gate (M7). Do not ship the experimental dialect as a production
  default without accepting that risk.
- **Streaming**: renderer streaming is production-shaped but the
  alpha's E2E coverage is protocol-level; richer streaming scenarios
  arrive with GA evidence.
- **Extensions**: json-enc and response-targets unsupported under the
  htmx 4 beta; SSE/WebSocket emulated — see the
  [compatibility matrix](../compatibility/matrix.md).
- **Sessions/auth fixtures**: reference apps use in-memory stores and
  fixture logins by design; production needs durable stores and real
  authentication (documented seams in the walkthroughs).
- **Deployment**: production = `bun <entry>`; no other runtime targets,
  no official container images yet.
- **Migration**: htmx 2→4 switching is audit-first with enforced
  dual-lane verification and a one-file rollback — see the
  [migration guide](../guides/htmx-migration.md).

## Upgrade and rollback

- **Install (alpha)**: packages publish as `0.1.0-alpha.1` on the
  `alpha` dist-tag (dependency-first order; see the
  [publish dry run](https://github.com/ther12k/bundar/blob/main/artifacts/publish-dry-run.md)).
- **Between alphas**: pin exact versions; re-run `bundar htmx-audit`
  and your test suite (both lanes) before upgrading; consult the
  changelog entry for each release.
- **Dialect rollback**: reverting to htmx 2 is a one-file change
  (`src/dialect.ts`) — see the
  [migration guide](../guides/htmx-migration.md).
- **Verify integrity**: `sha256sum -c artifacts/packages/checksums.txt`.

## Changelog

See the repository log (`log.md`) for the per-issue delivery history
(96 tracked issues across M0–M7) and the milestone gates under
`delivery/gates/`.
