# GH-163 verification transcript — Release Safety, Candidate Artifact Pipeline, and Registry Verifier (BR-111)

Issue #163 · branch `gh-163-release-safety` · base main `f290c7c`.

## Background & Scope

Resolves the release-safety, artifact-integrity, and testing-parity findings from the fifth external re-audit:

1. **Release Safety (`publish:approved`)**:
   - Strictly respects `--dry-run`: when `--dry-run` is passed (or credentials missing), it validates the candidate manifest, verifies that candidate tarballs exist and their SHA-256 digests match, prints the verified execution plan, and exits 0 without calling `npm publish`.
   - Rejects `--tag latest` unless `--allow-latest-tag` is explicitly provided (ADR-0021).
   - Only publishes the exact `.tgz` files verified in `candidate-manifest.json` (never rebuilds tarballs from source directories).

2. **Candidate Artifact Pipeline & Immutable Manifest**:
   - `tools/release/pack-release.ts`: Generates `artifacts/release/candidate-manifest.json` binding candidate source SHA, version (`0.1.0-alpha.2`), dist-tag, and exact tarball file paths and SHA-256 hashes.
   - `publish:dry-run` and `publish:approved` unified around this candidate manifest and exact `.tgz` files.

3. **Cross-Artifact Set Equality (`release:verify`)**:
   - `tools/release/verify.ts`: Replaced hardcoded counts with dynamic validation ensuring exact set equality across candidate manifest, `checksums.txt` (9 entries), `sbom.json` release components (9 components), `provenance.json` subjects (9 subjects), and publish plan (9 packages).
   - Wired as the final step 27 in `ci:release`.

4. **Registry Verifier (`registry:verify`)**:
   - Implemented `tools/release/registry-verify.ts` and added script `"registry:verify"` to `package.json`.
   - In preflight mode (`bun run registry:verify -- --preflight`), validates that the candidate manifest is ready for post-publish registry checking.
   - Post-publish: queries `npm view` for each package and asserts version, dist-tag, license, and integrity match the candidate manifest.

5. **Testing Parity Residuals**:
   - `packages/testing/src/cookies.ts`: `hostOnlyOrigin` defaults to `"localhost"` when requestUrl is omitted; `hostMatches()` strictly checks `record.hostOnlyOrigin` so host-only cookies never leak across hosts.
   - `packages/testing/src/client.ts` & `packages/testing/src/server.ts`: Pre-dispatch `RequestReplaySnapshot` captures body buffer before handler execution, ensuring 307/308 redirects replay the request body even if the initial handler consumed it. Tested in `conformance-matrix.test.ts` (test 6d).

6. **Documentation**:
   - `README.md`: Added `@bundar/forms` to the package table.

## Verification Results

- Testing package test suite: **72 pass / 0 fail** across 6 files (195 expect calls).
- Full repository test suite: **1,181 pass / 0 fail** across 148 files (10,612 expect calls).
- `bun run ci:release`: **all 27 release-candidate steps passed** (exit 0).
- `bun run release:verify`: all 4 go/no-go preconditions hold (exit 0).
- `bun run registry:verify -- --preflight`: 9/9 candidate tarballs verified ready.
- `bun run publish:approved -- --dry-run`: verified candidate tarballs and printed plan without publishing.
- `tsc --noEmit`, `eslint .`, `prettier --check .`, `architecture:check`, `docs:check`, `docs:status-check`, `issues:check`: all exit 0.

## Acceptance criteria

- [x] `publish:approved` strictly respects `--dry-run` and `--candidate-manifest`, never rebuilding tarballs or publishing during dry-run.
- [x] Candidate pipeline builds `0.1.0-alpha.2` artifacts once with `candidate-manifest.json` and hashes verified throughout audit, SBOM, provenance, cleanroom, and verify.
- [x] `release:verify` performs strict set equality across all release artifacts for 9 packages.
- [x] `registry:verify` tool implemented and ready for canary verification.
- [x] `CookieJar` host-only origin default and 307/308 pre-dispatch replay snapshot tested.
- [x] README.md package table lists all 9 workspace packages including `@bundar/forms`.
EOF
cat >> log.md <<'EOF'

## 2026-08-27 — BR-111 (#163): candidate artifact pipeline, publisher safety, and registry verifier

- `tools/release/publish-approved.ts`: strictly supports `--dry-run` (verifies candidate manifest and tarballs on disk without publishing), rejects publishing during dry-run or when manifest checksums mismatch, forbids `--tag latest` without explicit override, and publishes exact `.tgz` files recorded in `candidate-manifest.json`.
- `tools/release/pack-release.ts` & `publish-dry-run.ts`: writes `artifacts/release/candidate-manifest.json` binding the candidate SHA, version (`0.1.0-alpha.2`), dist-tag, and SHA-256 digests.
- `tools/release/verify.ts`: performs cross-artifact set equality across candidate manifest, checksums, SBOM, provenance, and publish order for all 9 packages; wired as final step 27 in `ci:release`.
- `tools/release/registry-verify.ts`: implemented registry verification tool (`bun run registry:verify`) with `--preflight` check.
- Testing parity: `CookieJar` enforces `hostOnlyOrigin` default preventing cross-host leakage; `createTestClient`/`startTestServer` captures pre-dispatch replay snapshot so 307/308 redirects replay body even if consumed by handler (test 6d in conformance matrix).
- `README.md`: `@bundar/forms` added to the package table.
- All 27 steps of `ci:release` green; full suite 1,181 pass / 0 fail.
EOF