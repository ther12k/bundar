# GH-005 Verification Transcript

## Environment

Bun 1.4.0, TypeScript 6.0.3, Ubuntu 24.04.4 LTS (kernel 7.0.0-28-generic,
x86_64). Recorded 2026-08-21 on branch `gh-005-api-boundaries-freeze`.

## Planned verification block

```text
$ bun run docs:validate
docs:validate: ok (207 documents, 96 issues, local structural validation only — it is not certification by Google or any third party)
  -> exit 0

$ bun run architecture:check
architecture:check: ok (7 package boundary rules enforced)
  -> exit 0
```

`architecture:check` is a real implementation of the planned placeholder
(`tools/architecture-check/check.ts` + machine-readable
`tools/architecture-check/boundaries.json`, frozen by ADR-0016): import
extraction from every `src/**/*.ts(x)` across the seven framework packages,
allowlist enforcement for `@bundar/*` cross-imports, external-dependency
rejection (zero-runtime-dependency policy and explicit-dependency rule),
relative-escape detection, and raw-htmx-string confinement (`HX-*` headers,
`htmx:*` events) to `@bundar/htmx`. Wired into CI.

## Adversarial probe

Injecting into `packages/core/src/index.ts`:

```ts
import { htmx2 } from "@bundar/htmx/2";
import { parse } from "yaml";
export function isHtmx(request: Request): boolean {
  return request.headers.get("HX-Request") === "true";
}
```

```text
$ bun run architecture:check
architecture:check failed with 3 violations (rules: ADR-0016):
  - packages/core/src/index.ts: package @bundar/core may not import "@bundar/htmx/2" (allowed: none)
  - packages/core/src/index.ts: external import "yaml" is not allowed in @bundar/core (framework packages declare dependencies explicitly via ADR)
  - packages/core/src/index.ts: raw htmx protocol string "HX-Request" outside @bundar/htmx (dialect adapters own htmx specifics)
  -> exit 1
```

File restored; `architecture:check` green again. All three frozen invariants
(cross-package direction, zero-dep policy, htmx confinement) are
machine-enforced, not just documented.

## Regression battery

`format:check`, `lint`, `typecheck`, `bun test` (14/14), `build`,
`docs:check`, `issues:graph` — all exit 0.

## Contract freeze summary (ADR-0016)

- Package map and dependency direction frozen; `@bundar/core` and
  `@bundar/jsx` zero-runtime-dependency policy explicit.
- Handler contract frozen: `Response | Promise<Response>` only; no second
  router; no hidden browser runtime.
- Server-only JSX boundary frozen (no hydration/vdom; `raw` is the only
  trust escape).
- HTMX stable subset + escape hatch frozen at principle level; version
  specifics confined to dialect adapters.
- Forbidden dependencies and non-goals recorded.
- Pre-1.0 API change classification (A/B/C) with evidence requirements.
- Symbol ownership map added to `engineering/package-api.md`: every planned
  public symbol family has an owning package; nothing silently unowned.

## Residual risks and deviations

- Exact signatures deliberately deferred (issue out-of-scope rule); the
  freeze is at the principle/ownership level.
- The boundary engine scans source text for `HX-*`/`htmx:*` confinement; a
  symbol-level lint (GH-006 harness) will layer stricter checks on top.
- Test-harness coverage of the checker itself belongs to GH-006 by charter.
