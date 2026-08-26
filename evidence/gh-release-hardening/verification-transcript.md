# GH-Release-Hardening Verification Transcript (#157, #158, #159, #160, #161, #162)

Branch `gh-release-hardening` · base main `020a9d9`.

## What changed across the 6 audit findings

1. **#157 (BR-105) — Authoritative candidate publication pipeline & exact tarball publisher**:
   - `tools/release/pack-release.ts`: `buildCandidateTarballs({ version, outputDir })` packs the 9 workspace packages into publication-form tarballs, sets publication version (`0.1.0-alpha.2`), deletes `"private": true` in packed manifests only, rewrites internal `workspace:*` dependencies to caret ranges (`^${version}`), and returns exact SHA-256 digests.
   - `tools/release/publish-approved.ts`: accepts `--version` and `--tag` flags, verifies pre-publish SHA-256 checksums, and publishes the exact `.tgz` files via `npm publish <file.tgz> --tag <tag>` (never source directories).
   - `tools/release/publish-dry-run.ts`: unified to use `buildCandidateTarballs` with `--version` and `--tag` support (42/42 checks pass for `0.1.0-alpha.2` @ `canary`).

2. **#158 (BR-106) — 9-package dynamic validation in `release:verify` & wired into `ci:release`**:
   - `tools/release/verify.ts`: derives package count dynamically from `PUBLISH_ORDER.length` (9 packages).
   - `scripts/release-gate.ts`: wired `release:verify` as the final 27th step of `ci:release`. Updated step labels.

3. **#159 (BR-107) — Cleanroom journey from packed create-bundar tarball**:
   - `tools/dx-cleanroom.ts`: packs `create-bundar` into the candidate registry and executes scaffolding directly from the unpacked tarball distribution (`19/19 steps pass`).

4. **#160 (BR-108) — Clean release SBOM inventory**:
   - `tools/release/sbom.ts`: filters out internal `workspace:` packages, example apps (`@bundar/example-*`), and templates from external dependency inventory. Total components: 125 (9 release packages + 116 lock-resolved external libraries).

5. **#161 (BR-109) — Testing parity: Cookie identity, WeakMap redirect request binding, relative Location**:
   - `packages/testing/src/cookies.ts`: `CookieJar` keys cookies by `name \0 (domain ?? hostOnlyOrigin) \0 path`. Multiple cookies with the same name across paths/domains coexist; host-only cookies strictly match originating hostname; header serialization sorts by longest path first (RFC 6265 §5.4).
   - `packages/testing/src/client.ts` & `packages/testing/src/server.ts`: `responseRequestMap` (`WeakMap<Response, Request>`) binds every response to its originating request for deterministic `follow()` method/body replay even during concurrent or interleaved requests. Relative `Location: next` resolves against the requesting URL via `new URL(location, base)`.
   - Tested in `packages/testing/test/cookies.test.ts` and `packages/testing/test/conformance-matrix.test.ts` (70/70 testing tests pass).

6. **#162 (BR-110) — Byte-aware chunkBytes in `renderToStream`**:
   - `packages/jsx/src/render-to-stream.ts`: `ChunkCollector` tracks UTF-8 byte length via `Buffer.byteLength(text, "utf8")` instead of UTF-16 code units.
   - Tested in `packages/jsx/test/streaming/render-to-stream.test.ts` (24/24 streaming tests pass).

## Verification battery results

- Full repository test suite: **1,178 pass / 0 fail** across 148 files (10,612 expect calls).
- `bun run ci:release`: **all 27 release-candidate steps passed** (exit 0).
- `bun run release:verify`: all 4 go/no-go preconditions hold (exit 0).
- `tsc --noEmit`, `eslint .`, `prettier --check .`, `architecture:check`, `docs:check`, `docs:status-check`, `issues:check`: all exit 0.
EOF
cat >> log.md <<'EOF'

## 2026-08-27 — Release Hardening Wave (#157, #158, #159, #160, #161, #162)

- **BR-105 (#157)**: Authoritative candidate publication pipeline (`tools/release/pack-release.ts`) builds exact `.tgz` files with synchronized `^version` dependencies and `"private": false` in packed manifests only. `publish:approved` and `publish:dry-run` unified to publish exact tarballs with `--version` and `--tag` support.
- **BR-106 (#158)**: `release:verify` updated for dynamic 9-package validation and wired as the final fail-closed step in `ci:release` (all 27 steps green).
- **BR-107 (#159)**: Cleanroom developer journey (`tools/dx-cleanroom.ts`) runs scaffolding exclusively from the packed `create-bundar` tarball artifact (19/19 steps pass).
- **BR-108 (#160)**: Release SBOM (`tools/release/sbom.ts`) cleans out internal `workspace:` packages and example apps, correctly inventorying 9 release packages + 116 external dependencies.
- **BR-109 (#161)**: Testing parity gaps closed: `CookieJar` models browser identity `name+origin+path` with RFC 6265 §5.4 path-specificity sorting and host-only isolation; `follow(response)` uses `WeakMap<Response, Request>` to bind exact originating request context; relative redirects resolve against request URLs.
- **BR-110 (#162)**: `renderToStream` `ChunkCollector` tracks UTF-8 bytes (`Buffer.byteLength`) instead of UTF-16 code units.
EOF