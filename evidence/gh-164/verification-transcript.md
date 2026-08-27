# GH-164 verification transcript — candidate integrity and post-publish proof (BR-112)

Issue #164 · branch `gh-164-candidate-integrity` · source implementation commits
`535c43f4b83743b07357215ecb41251a8ed4dcea` and
`98581e72e11ae7f6c335136566034c9ae3921944`.

## Scope

This correction wave closes the sixth re-audit findings against the BR-111
release pipeline:

- `publish:dry-run` validates the freshly packed temporary tarballs through all
  export, metadata, clean-install, entry-point, JSX, TSX, and CLI checks before
  copying those exact bytes to `artifacts/packages/`.
- `candidate-manifest.json` serializes only the portable fields
  `{name, version, tarballFile, tarballPath, sha256}`; machine-local
  `absolutePath` is internal only.
- `release:verify` compares the manifest source SHA with the current clean
  package-affecting source tree, permits only docs/artifact-only commits after
  an ancestor candidate, rejects dirty source, and fails on missing SBOM
  SHA-256 values instead of filling them from the manifest.
- `release:verify` validates provenance source binding (`configSource` and
  `materials[0]` match manifest `sourceSha`), candidate manifest field shapes,
  and SBOM dependency graph referential integrity across all 126 components.
- `registry:verify` supports flat and nested npm `dist-tags` responses and
  requires `--download` for byte-level post-publish proof; SRI algorithm
  presence alone is not treated as a SHA-256 match.
- The human-gated workflow asserts the input version matches the candidate
  manifest, invokes post-publish verification with `--download`, and uploads
  its report even after a verification failure.
- Regression tests cover fresh-path selection, portable manifest serialization,
  strict field validation, PURL normalization, and rejection of uncommitted
  package-affecting source changes.

## Environment

- Bun 1.4.0 (`34cbb9a40`)
- TypeScript 6.0.3
- ESLint 10.8.1
- Prettier 3.9.6
- Linux x64
- Candidate: `0.1.0-alpha.2` on `canary`
- Publication set: 9 packages, dependency-first order

## Verification commands and results

All commands were run from the committed `98581e72e11ae7f6c335136566034c9ae3921944`
tree unless noted.

1. `bun test tests/release/` — **20 pass, 0 fail, 54 assertions**.
2. `bun run publish:dry-run` — **42 checks passed**; all checks consumed the
   fresh temporary candidates and the persisted copies were independently
   re-hashed before manifest generation.
3. Sequential artifact stages:
   - `bun run release:sbom` — 125 components (9 release packages + 116
     lock-resolved externals), 10 dependency nodes.
   - `bun run release:provenance` — 9 subjects bound to source SHA
     `98581e72e11ae7f6c335136566034c9ae3921944`.
   - `bun run release:reproduce` — 9 packages reproducible; unpacked trees
     byte-identical across independent runs.
4. `bun run release:verify` — **all go/no-go preconditions hold**:
   candidate SHA/clean-source identity, on-disk hashes, publish order,
   checksums/SBOM/provenance set equality, SBOM graph integrity (126 component refs),
   plan consistency, namespace clearance, stable/no-JS lanes, and experimental
   non-default htmx 4.
5. `bun run registry:verify -- --preflight` — **9/9** on-disk SHA-256 matches.
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
13. `bun test` — the first parallel full-suite run had two unrelated,
    load-sensitive failures (`GH-072` dev-loop timeout and `BR-058` socket
    cancellation). Each was rerun in isolation and passed:
    - `bun test ./packages/cli/test/dev/loop.test.ts` — 1 pass, 0 fail.
    - `bun test ./packages/core/test/integration/abort-runtime.test.ts` — 6
      pass, 0 fail.
    No BR-112 test failed; no mandatory failure was hidden or converted to a
    warning.

## Artifact identity

`artifacts/release/candidate-manifest.json` records source SHA
`98581e72e11ae7f6c335136566034c9ae3921944`, version `0.1.0-alpha.2`, tag
`canary`, 9 packages, repo-relative paths only, and no `absolutePath` keys.
The manifest, checksums, SBOM, provenance, and dry-run plan contain identical
`{name, version, tarballFile, sha256}` records:

- `@bundar/core`: `bundar-core-0.1.0-alpha.2.tgz` (`61faad4917f8ecac3270e1cae4ba081da0db6b265d809d0b43757432bf5a3f5d`)
- `@bundar/jsx`: `bundar-jsx-0.1.0-alpha.2.tgz` (`ad9d181638897a9092789fe7c6c13559d3f66ca70b759213c9d643392adedd8d`)
- `@bundar/schema`: `bundar-schema-0.1.0-alpha.2.tgz` (`9835eacb1f05ce2100e861db0c4e822a629b22719dd0542fb8afd1dbe8391909`)
- `@bundar/forms`: `bundar-forms-0.1.0-alpha.2.tgz` (`022ee6adea81f76deb5fde287a990da63dab0661d5ebe304772247479b261917`)
- `@bundar/security`: `bundar-security-0.1.0-alpha.2.tgz` (`fc9c2ea61247a0d0f4a73c7c6010758fa6e6074e56ffe730073afa1f5fcf7d7a`)
- `@bundar/htmx`: `bundar-htmx-0.1.0-alpha.2.tgz` (`58e9886f4fc5579f11858eb5bdc394c0add8edaa304272e95bb28601854a5488`)
- `@bundar/testing`: `bundar-testing-0.1.0-alpha.2.tgz` (`0a977fa03b8282dfa11d71347a0e047e242e2e417c20406c93178a760fef0135`)
- `@bundar/cli`: `bundar-cli-0.1.0-alpha.2.tgz` (`d49e9abed6c35624be538196d196215b90a9009cf06b5af278163573d6003da4`)
- `create-bundar`: `create-bundar-0.1.0-alpha.2.tgz` (`c283ac859bf91bbbe9d343ee63d787fde7eeab55b3402f3e239a7b3b74be25db`)

## Acceptance criteria

- [x] Fresh candidate bytes are validated before persistence; stale persisted
      tarballs cannot mask a broken fresh candidate.
- [x] Candidate manifest is portable and excludes machine-local paths.
- [x] Candidate identity is commit-bound and rejects dirty package source.
- [x] Missing SBOM digests fail cross-artifact equality.
- [x] Registry post-publish proof is byte-for-byte via required `--download`.
- [x] Workflow version input matches manifest and failure evidence is retained.
- [x] No credential value was committed, printed, uploaded, or included in an
      artifact; no npm publication was executed.

## Residual risks and gates

- The official `candidate-release.yml` workflow has not yet been run from the
  merged main commit; its run ID must be recorded after merge.
- Live npm publication remains blocked by human gate #130. A maintainer must
  perform the read-only namespace check, configure the protected environment and
  secrets, and approve any live publish. This issue does not authorize or perform
  that action.
- The two unrelated full-suite integration tests are timing-sensitive under
  concurrent load but passed independently; their existing behavior was not
  changed in this issue.

- The official `candidate-release.yml` workflow has not yet been run from the
  merged main commit; its run ID must be recorded after merge.
- Live npm publication remains blocked by human gate #130. A maintainer must
  perform the read-only namespace check, configure the protected environment and
  secrets, and approve any live publish. This issue does not authorize or perform
  that action.
- The two unrelated full-suite integration tests are timing-sensitive under
  concurrent load but passed independently; their existing behavior was not
  changed in this issue.
