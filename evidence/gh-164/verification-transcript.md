# GH-164 verification transcript — candidate integrity and post-publish proof (BR-112)

Issue #164 · branch `gh-164-candidate-integrity` · source implementation commits
`535c43f4b83743b07357215ecb41251a8ed4dcea` and
`4658d4bec257d332d1d7606de09cc3ee827e6390`.

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

All commands were run from the committed `4658d4bec257d332d1d7606de09cc3ee827e6390`
tree unless noted.

1. `bun test tests/release/` — **20 pass, 0 fail, 54 assertions**.
2. `bun run publish:dry-run` — **42 checks passed**; all checks consumed the
   fresh temporary candidates and the persisted copies were independently
   re-hashed before manifest generation.
3. Sequential artifact stages:
   - `bun run release:sbom` — 125 components (9 release packages + 116
     lock-resolved externals), 10 dependency nodes.
   - `bun run release:provenance` — 9 subjects bound to source SHA
     `4658d4bec257d332d1d7606de09cc3ee827e6390`.
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
13. `bun test` — 1,192 tests pass across 150 files.

## Artifact identity

`artifacts/release/candidate-manifest.json` records source SHA
`4658d4bec257d332d1d7606de09cc3ee827e6390`, version `0.1.0-alpha.2`, tag
`canary`, 9 packages, repo-relative paths only, and no `absolutePath` keys.
The manifest, checksums, SBOM, provenance, and dry-run plan contain identical
`{name, version, tarballFile, sha256}` records:

- `@bundar/core`: `bundar-core-0.1.0-alpha.2.tgz` (`1edc6daae3b9ef00e27f0619986324ac6043e30c85b166b5db6d8eafaedb2d62`)
- `@bundar/jsx`: `bundar-jsx-0.1.0-alpha.2.tgz` (`14372e7137c8a00b6adbf69d71e76116af92094f9a06ea15c4c7899de6a70be5`)
- `@bundar/schema`: `bundar-schema-0.1.0-alpha.2.tgz` (`c8c5f29a1298430e739fc8ca6be5e5f21e7084922f290a62ddcc62394b2a3fdb`)
- `@bundar/forms`: `bundar-forms-0.1.0-alpha.2.tgz` (`3e9a10ea7830e186b85b2670792e959574b05de4b09920894258bc2c9f712379`)
- `@bundar/security`: `bundar-security-0.1.0-alpha.2.tgz` (`9b99785f51ba4e9dc963939311c7cdc8b79226aa9980a7be64317c52e5ecce1d`)
- `@bundar/htmx`: `bundar-htmx-0.1.0-alpha.2.tgz` (`71341c7e4a069ffd832a3f39f57c3ffa30502115ea4f194bf6df5fbc1b30863f`)
- `@bundar/testing`: `bundar-testing-0.1.0-alpha.2.tgz` (`0491a95739e4582ed6d47691307c7ef2c2c68ac367beb36d88f1635322e70448`)
- `@bundar/cli`: `bundar-cli-0.1.0-alpha.2.tgz` (`b82642688034a2821c8418cfabe2dee848961c5f6ecf4d3d47bbfdecbcd2bdb2`)
- `create-bundar`: `create-bundar-0.1.0-alpha.2.tgz` (`fa463043295030043b4f8701cd2f2012feffdef11347df131cb4ae643e191089`)

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

## Public release battery run

- **Workflow**: `candidate-release.yml` (Candidate Release Battery)
- **Run ID**: `33057865140`
- **Run URL**: https://github.com/ther12k/bundar/actions/runs/33057865140
- **Head commit**: `7d0f8b53967b1bbbaba10ae7138b314dc83a8451`
- **Conclusion**: `success` (all 27 release steps passed in 8m12s)
- **Artifacts**: `release-candidate-artifacts-7d0f8b53967b1bbbaba10ae7138b314dc83a8451`

## Residual risks and gates

- Live npm publication remains blocked by human gate #130. A maintainer must
  perform the read-only namespace check, configure the protected environment and
  secrets, and approve any live publish. This issue does not authorize or perform
  that action.
- The two unrelated full-suite integration tests are timing-sensitive under
  concurrent load but passed independently; their existing behavior was not
  changed in this issue.
