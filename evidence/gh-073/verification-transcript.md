# GH-073 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-073-route-manifests`

## Delivered contract

**Core** (`packages/core/src/manifest.ts`, exported from `@bundar/core`):
- `buildRouteManifest(app.manifest())` — deterministic manifest (fixed epoch
  `generatedAt`; output depends only on routes). Named routes only
  (`meta.name`); duplicate names fail with both registration positions.
  `pathParams` extracts unique `:param` names.
- `generateRoutesModule` — emits a typed `RouteUrls` interface + `urls`
  object: per-route param types (`{ id: string | number }`; missing required
  params are compile errors AND runtime throws), optional query objects with
  repeated array values, `encodeURIComponent` on path segments,
  `URLSearchParams` serialization. Quoted property keys keep hyphenated
  route names valid; `readonly string[]` typing keeps output strict-clean.

**CLI** (`packages/cli/src/commands/routes.ts`, `bundar routes`):
- `routes generate --entry <app> --out <file>` loads the app entry in a child
  process (handlers never invoked — only the manifest prints), writes the
  module.
- `routes check` byte-compares current vs regenerated output — stale
  generations exit 1 with an actionable message (CI mode).
- `@bundar/cli` now declares `@bundar/core` as a workspace dependency (its
  first, intentional per package-API map).

**Root scripts**: `routes:generate`, `routes:check`, `test:consumer:routes`.

## Exact verification commands

```text
$ bun install
  -> exit 0

$ bun run --filter @bundar/core typecheck / --filter @bundar/cli typecheck
  -> exit 0

$ bun test ./packages/cli/test/routes
  6 pass, 0 fail (manifest determinism, duplicate names, param extraction,
  generated-module TypeScript compile via real tsc, deterministic diffs)

$ bun run routes:generate
  bundar routes: generated 3 named route(s) → tests/consumer/routes/routes.gen.ts
  -> exit 0

$ bun run routes:check
  bundar routes:check: tests/consumer/routes/routes.gen.ts is up to date
  -> exit 0

$ (tamper) routes:check
  -> exit 1: "is stale (routes changed since generation); re-run routes:generate"

$ bun run test:consumer:routes
  6 pass, 0 fail (generated URLs hit a live server: encoded params resolve,
  repeated query values, runtime missing-param throw, param-less routes,
  regeneration stability, deterministic route-change diff)

$ bun test
  275 pass, 0 fail, 2656 expect calls across 35 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (39 files) / pack:inspect / build / format:check
  -> exit 0
```

## Acceptance evidence

- Missing required params fail typecheck: the generated `RouteUrls` types
  params per route; the emitted module compiles under `tsc --strict` (real
  compile asserted); runtime throws mirror the type contract.
- Generated URLs match server routes: consumer fixture generates, imports,
  and fetches through a live `Bun.serve` — `user-show` with encoded `a b/cé`
  resolves to `user:a b/cé`.
- Deterministic diffs: removing/renaming routes changes output bytes
  reproducibly; identical inputs produce identical bytes (no wall clock).
- Generator never executes handlers: it reads the manifest via a child
  process that only registers routes and prints JSON.
- Stale detection: `routes:check` exits 0 in sync, exits 1 with actionable
  message after tampering (CI mode).
- No mandatory test failure hidden, skipped, or downgraded. Defects found
  and fixed during verification: hyphenated names emitted invalid
  identifiers; untyped `required` array broke strict compile; CLI test
  violated the relative-import boundary (now imports `@bundar/core` via the
  workspace dependency).

## Residual risks

- `routes generate` requires the entry to default-export an `App` without
  starting a server at import time (documented contract for app modules).
- Typed JSON RPC / OpenAPI generation remains out of scope for v0.1.
