# GH-045 verification transcript — HTMX asset registry and local serving contract

## Issue

[GH-045 — Implement the HTMX asset registry and local serving contract](../../issues/m3/gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md)
(branch `gh-045-asset-registry`, worktree `bundar-gh-045`, base commit `1b2e619` = main after the GH-051 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` (depends on @bundar/core, @bundar/jsx, @bundar/schema), pinned dialect profiles htmx `2.0.10` / `4.0.0-beta6` (never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/assets.ts` (new):
  - `getBundledAsset(dialect)`: loads verified SHA-256-pinned local assets completely offline (htmx 2.0.10 and htmx 4.0.0-beta6) with zero runtime network downloads.
  - `validateAssetDialectMatch(assetVersion, dialect)`: verifies that asset version matches dialect adapter (detects dialect/asset mismatches).
  - `createHtmxAssetHandler(options)`: HTTP request handler serving configured or bundled asset locally with `application/javascript; charset=utf-8`, ETag with 304 Not Modified support on `If-None-Match`, `Cache-Control: public, max-age=31536000, immutable`, and `x-htmx-version` header.
  - Error classes: `AssetRegistryError`, `AssetDialectMismatchError`.
- `packages/htmx/src/script.ts` (new):
  - `<HtmxScript>` JSX component: renders `<script>` tag referencing local asset with `data-htmx-version`, SRI integrity hash (`integrity`), `crossorigin="anonymous"`, `defer`, and CSP `nonce` support.
- `packages/htmx/src/vendor/`: bundled local assets `htmx2.min.js` and `htmx4.min.js`.
- Tests: `packages/htmx/test/assets/assets.test.ts` (14 tests) — offline asset loading, SHA-256 verification, dialect matching and mismatch rejection, 200/304/HEAD/405 asset handler behavior, custom asset without network calls, and `HtmxScript` rendering with metadata/CSP nonce.
- Browser lanes: `tests/browser/server.ts` uses `createHtmxAssetHandler`; `tests/browser/run.ts` asserts 200 with immutable cache and 304 Not Modified in both `htmx2` and `htmx4` lanes.
- `.prettierignore` and `eslint.config.js`: added `**/*.min.js` to prevent vendor asset alteration.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/assets/**` (as `bun test ./packages/htmx/test/assets`) — exit 0; 14 tests, 40 expect() calls, 0 fail.
3. `bun run test:browser:htmx2` / `htmx4` — exit 0; the asset-serving scenario passed in both lanes (`output/playwright/*/asset.json`).
4. `bun run test:browser:report` — exit 0.
5. `bun run --filter @bundar/htmx typecheck` and root `bun run typecheck` — exit 0.
6. `bun run lint`, `bun run format:check` — exit 0.
7. `bun test` (full) — exit 0; 604 tests across 72 files, 0 fail, 7,705 expect() calls.
8. `bun run architecture:check` — exit 0 (70 source files).
9. `bun run pack:inspect @bundar/htmx` — exit 0 (includes `src/vendor/*.min.js`).
10. `bun run build` — exit 0.
11. `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) — exit 0.

### Tooling decisions

- The planned `bun run test:browser:htmx2 -- assets` / `htmx4 -- assets` commands are covered by running the integrated browser lanes which execute and verify the `asset-serving` scenario.

## Acceptance evidence mapping

- "Default templates can run offline after install" — `getBundledAsset()` and `createHtmxAssetHandler()` load bundled assets from package files without network calls.
- "Exact asset version is visible in generated HTML or manifest" — `<HtmxScript>` emits `data-htmx-version="2.0.10"`, asset handler sets `x-htmx-version: 2.0.10`.
- "User-supplied asset mode does not download at runtime" — `createHtmxAssetHandler({ customAsset, customVersion })` serves memory/local buffer directly.
- "An asset/dialect mismatch is detected in development and conformance tests" — `validateAssetDialectMatch()` and `createHtmxAssetHandler` throw `AssetDialectMismatchError` on mismatched versions.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record, `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks

- None identified; assets are offline and SHA-256 verified.

## Newly unblocked

- GH-053 (HTMX 2 browser conformance profile), GH-054 (HTMX 4 beta browser conformance profile), and GH-066 (security headers, CSP, and nonce propagation).
