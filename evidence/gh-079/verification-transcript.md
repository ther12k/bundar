# GH-079 verification transcript — generated API reference and compatibility documentation source

## Issue

[GH-079 — Publish generated API reference and compatibility documentation
source](../../issues/m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md)
(branch `gh-079-api-reference`, worktree `bundar-gh-079`, base commit
`9087e13` = main after the GH-078 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`;
  Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- Pinned htmx 2.0.10 (stable) and 4.0.0-beta6 (experimental — no GA
  claim); versions in the generated sheet come from the adapters' own
  asset registry.

## What changed

- `tools/docs/generate-api.ts` (new): extracts every public package's
  surface — runtime exports via live import, type-only exports via
  source scan — into `docs/api/<package>.md` (7 packages) plus a
  navigation index `docs/api/README.md`; 383 exports indexed, every
  export listed exactly once. The htmx page carries the EXPERIMENTAL
  marker derived from the beta adapter's own maturity/pinned-version
  data (never hand-maintained).
- `tools/docs/generate-compat.ts` (new): `docs/compatibility/versions.md`
  — exact Bun/TypeScript/ESLint/httmx versions from versioned source
  (package manifests + dialect asset registry), with the freshness-owner
  contract: the maintainer merging a dependency/dialect change
  regenerates and commits in the same change.
- `docs:generate` script (API + compatibility, idempotent: second run
  reports "up to date" and changes nothing — drift is visible as a
  working-tree diff which CI/review catches; the committed state is the
  generated state).
- `docs/snippets/*.ts` (new, 6 runnable snippets): lifecycle events,
  errors (production boundary opacity), cache policy, validated forms
  (both worlds via @bundar/testing), CSRF fail-closed, streaming with
  backpressure — each executing real assertions against the public API.
- `tests/docs/snippets.test.ts` + `docs:snippets` script: every snippet
  runs in CI; the set-size assertion guards topic coverage.
- Root tsconfig path for `@bundar/cli` (runtime resolution for tools).

## Real defect found by a snippet

The first cache-policy snippet draft called `cachePolicyFor("fragment")`
and crashed inside `applyCachePolicy` — not a framework bug but an API
misuse the types should have caught (the function takes a
`NegotiatedView`). The committed snippet documents the correct contract
(`negotiateView(normalizeHtmxRequest(request))` → `cachePolicyFor`),
and the crash surfaced that `applyCachePolicy` throws an obscure
TypeError when given a malformed policy rather than a clear diagnostic —
recorded here as an observation; the public contract itself is sound.

## Exact commands and exit statuses

1. `bun run docs:generate` — exit 0; 8 files, 383 exports indexed;
   re-run reports "up to date" (idempotent, committed state =
   generated state).
2. `bun run docs:snippets` — exit 0; 7 tests (6 snippets + coverage
   assertion).
3. `bun run docs:check` — exit 0 (14 manifests). `bun run api:check` —
   exit 0 (core snapshot unchanged: 77 runtime + 0 type exports).
4. `bun run docs:validate` — exit 0 (216 documents now). `docs:links` —
   exit 0 (1,160+ links resolve, including the new docs/api pages).
5. `bun run typecheck` / `lint` / `format:check` — exit 0.
6. `bun run architecture:check` — exit 0 (89 source files).
7. `bun run pack:inspect @bundar/testing` — exit 0 (spot check;
   packages unchanged by this issue).
8. `bun test` (full) — exit 0; 814 tests across 98 files (the 7 snippet
   tests included), 8,279 expect() calls, 0 fail.

## Acceptance evidence

- **Every public export appears exactly once in reference navigation**:
  the index is generated from the live surfaces (per-package runtime +
  type counts; per-page sorted listings; no hand-written entries).
- **Examples compile against packed packages**: snippets import only
  package names (`@bundar/core`, …) resolved through the same
  exports/maps packed consumers use; pack:inspect verifies the
  manifests; snippets execute (not just typecheck) in CI.
- **Current-version claims have a freshness owner**: the generated
  compatibility sheet states the regenerating-maintainer contract.
- **Experimental features visually/textually distinguished**: the htmx
  reference page and the version sheet derive ⚠️ EXPERIMENTAL markers
  from the beta adapter's maturity data; no GA claim anywhere.

## Residual risks and deviations

- Type-only export extraction reads `export type {…}` blocks from index
  sources — inline `export type X = …` declarations are counted as
  runtime-adjacent docs; acceptable for v0.1 (all current packages use
  block exports).
- Hosted documentation vendor deliberately out of scope (per the issue).

## Newly unblocked issues

GH-080 (guides can link the generated reference and snippets).
