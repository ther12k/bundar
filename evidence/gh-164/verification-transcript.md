# GH-164 verification transcript — candidate integrity and post-publish proof (BR-112)

Issue #164 · branch `gh-164-candidate-hardening` · source implementation commits
`535c43f4b83743b07357215ecb41251a8ed4dcea` and
`255614cf68607cb4ae364257967267dd34922995`.

## Scope

This correction wave closes the sixth and seventh re-audit findings against the
BR-111/BR-112 release pipeline:

- `publish:dry-run` validates the freshly packed temporary tarballs through all
  export, metadata, clean-install, entry-point, JSX, TSX, and CLI checks before
  copying those exact bytes to `artifacts/packages/`.
- `publish:dry-run` promotion is atomic: validation failures write a failure
  report (`success: false`) and exit immediately without modifying `artifacts/packages/`,
  `candidate-manifest.json`, or `checksums.txt`.
- `candidate-manifest.json` serializes only the portable fields
  `{name, version, tarballFile, tarballPath, sha256}`; machine-local
  `absolutePath` is internal only.
- `release:verify` compares the manifest source SHA with the current clean
  package-affecting source tree, permits only docs/artifact-only commits after
  an ancestor candidate, rejects dirty source, and fails on missing SBOM
  SHA-256 values instead of filling them from the manifest.
- `release:verify` validates provenance source binding (`configSource` and
  `materials[0]` match manifest `sourceSha`), candidate manifest field shapes,
  publication dry-run status (`success: true` and 42/42 checks passed), and
  SBOM dependency graph referential integrity across all 126 components.
- `registry:verify` supports flat and nested npm `dist-tags` responses, generates
  structured `artifacts/registry-verify.json`, and requires `--download` for
  byte-level post-publish proof; SRI algorithm presence alone is not treated as
  a SHA-256 match.
- The human-gated workflow (`.github/workflows/release.yml`) uses `fetch-depth: 0`
  in both preflight and publish jobs (enabling ancestor resolution), asserts the
  input version matches the candidate manifest, invokes post-publish verification
  with `--download`, and uploads publish and registry verification reports even
  after a verification failure.
- Regression tests cover fresh-path selection, portable manifest serialization,
  strict field validation, PURL normalization, atomic non-promotion, and
  rejection of uncommitted package-affecting source changes.

## Environment

- Bun 1.4.0 (`34cbb9a40`)
- TypeScript 6.0.3
- ESLint 10.8.1
- Prettier 3.9.6
- Linux x64
- Candidate: `0.1.0-alpha.2` on `canary`
- Publication set: 9 packages, dependency-first order

## Verification commands and results

All commands were run from the committed `255614cf68607cb4ae364257967267dd34922995`
tree unless noted.

1. `bun test tests/release/` — **23 pass, 0 fail, 67 assertions**.
2. `bun run publish:dry-run` — **42 checks passed**; all checks consumed the
   fresh temporary candidates and the persisted copies were independently
   re-hashed before manifest generation.
3. Sequential artifact stages:
   - `bun run release:sbom` — 125 components (9 release packages + 116
     lock-resolved externals), 10 dependency nodes.
   - `bun run release:provenance` — 9 subjects bound to source SHA
     `255614cf68607cb4ae364257967267dd34922995`.
   - `bun run release:reproduce` — 9 packages reproducible; unpacked trees
     byte-identical across independent runs.
4. `bun run release:verify` — **all go/no-go preconditions hold**:
   candidate SHA/clean-source identity, on-disk hashes, publish order,
   checksums/SBOM/provenance set equality, dry-run 42/42 checks status,
   SBOM graph integrity (126 component refs), plan consistency, namespace
   clearance, stable/no-JS lanes, and experimental non-default htmx 4.
5. `bun run registry:verify -- --preflight` — **9/9** on-disk SHA-256 matches;
   writes structured report to `artifacts/registry-verify.json`.
6. `bun run publish:approved -- --dry-run` — **exit 0**; candidate plan
   verified and no publication executed.
7. `bun run format:check` — **pass** after formatting the generated SBOM.
8. `bun run lint` — **pass**.
9. `bun run typecheck` — **pass**.
10. `bun run docs:validate && bun run docs:links` — **pass** (234 documents,
    1,262 links).
11. `bun run architecture:check` — **pass** (104 source files, 126 test files,
    9 package rules).
12. `bun run build` — **pass** for all 9 workspace packages.
13. `bun test` — 1,192 tests pass across 150 files.

## Artifact identity

`artifacts/release/candidate-manifest.json` records source SHA
`255614cf68607cb4ae364257967267dd34922995`, version `0.1.0-alpha.2`, tag
`canary`, 9 packages, repo-relative paths only, and no `absolutePath` keys.
The manifest, checksums, SBOM, provenance, and dry-run plan contain identical
`{name, version, tarballFile, sha256}` records:

- `@bundar/core`: `bundar-core-0.1.0-alpha.2.tgz` (`e44a5320dc36ac0780c4ee32a36ad30e55d5cf185e9ba14bf2049a05ebc6773b`)
- `@bundar/jsx`: `bundar-jsx-0.1.0-alpha.2.tgz` (`98f9427add91ebf92a3aece2b894b7e5dc0bdaa6601bb2e75767d757ddbb8688`)
- `@bundar/schema`: `bundar-schema-0.1.0-alpha.2.tgz` (`3c73cbfc2d958152a1888106e63e9bf5643e7c0374f34100ea8f550c46934c8e`)
- `@bundar/forms`: `bundar-forms-0.1.0-alpha.2.tgz` (`dd73639842571a226f9e06d925d47c7af98f20ead525beaf58eb3fe58d05fc27`)
- `@bundar/security`: `bundar-security-0.1.0-alpha.2.tgz` (`dfbdabf5c83c69ee8d67c26516874764d3a67736a03521c42ed1f31414557c7e`)
- `@bundar/htmx`: `bundar-htmx-0.1.0-alpha.2.tgz` (`b7c8e67b5d37ef9b6a709a8691af6dd263a844464ca47d317f24e57a3c1a73a0`)
- `@bundar/testing`: `bundar-testing-0.1.0-alpha.2.tgz` (`cd4a51c3d96725701838c1414c383e358dcc4227134fc9b1650927dd5a77a6f0`)
- `@bundar/cli`: `bundar-cli-0.1.0-alpha.2.tgz` (`d00766949de78dda9b3bbcf28d72f12c4066597026c76121f1ee1315edb8a14b`)
- `create-bundar`: `create-bundar-0.1.0-alpha.2.tgz` (`9161d8eaaad35630449213acedeb7007e764001786b7285462dc218f5534d412`)

## Acceptance criteria

- [x] Fresh candidate bytes are validated before persistence; stale persisted
      tarballs cannot mask a broken fresh candidate.
- [x] Validation failures in `publish:dry-run` fail closed without persisting
      tarballs or altering candidate manifests.
- [x] Candidate manifest is portable and excludes machine-local paths.
- [x] Candidate identity is commit-bound and rejects dirty package source.
- [x] Missing SBOM digests fail cross-artifact equality.
- [x] Release verification checks `publish-dry-run.json` success and all 42 checks.
- [x] Registry post-publish proof is byte-for-byte via required `--download`,
      generating structured `artifacts/registry-verify.json`.
- [x] Workflow version input matches manifest, `fetch-depth: 0` is used for
      all jobs, and failure evidence is retained.
- [x] No credential value was committed, printed, uploaded, or included in an
      artifact; no npm publication was executed.

## Residual risks and gates

- Live npm publication remains blocked by human gate #130. A maintainer must
  perform the read-only namespace check, configure the protected environment and
  secrets, and approve any live publish. This issue does not authorize or perform
  that action.
