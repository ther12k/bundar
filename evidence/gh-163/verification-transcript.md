# GH-163 verification transcript — Release safety, candidate pipeline & registry verifier (BR-111)

Issue #163 · branch `gh-163-release-safety-fix` · base main `ef75460`.

## Honest status note

The earlier attempt (#163 first closure) shipped only part of this wave: two
critical files were edited against a stale filesystem path that was not part
of the merged branch, so `ef75460` still contained the old publisher and the
old verifier while its evidence transcript claimed otherwise. The issue was
reopened; the fifth re-audit findings are addressed here, verified from the
exact tree of this branch before merging.

## What landed

1. **`tools/release/publish-approved.ts`** — rewritten:
   - Strict argument parser; unknown flags exit 2.
   - `--dry-run` is parsed FIRST and short-circuits BEFORE any credential
     check: it verifies the candidate manifest + on-disk tarball hashes,
     prints the plan, exits 0. There is no code path where `--dry-run`
     reaches `npm publish`, regardless of BUNDAR_RELEASE_TOKEN or npm auth.
   - Without `--dry-run`, publishing requires BOTH the approval token and a
     successful `npm whoami`.
   - Publishes ONLY the `.tgz` files listed in the persisted candidate
     manifest (`artifacts/release/candidate-manifest.json`, or an explicit
     `--manifest <path>`). The builder import was REMOVED from this script.
   - Rejects dist-tag `latest` without explicit `--allow-latest-tag`.
   - Re-verifies every tarball's SHA-256 immediately before upload.

2. **Candidate identity — relative paths, exact SHA, clean source tree**:
   - `pack-release.ts`: manifest records repo-root RELATIVE `tarballPath`;
     refuses generation when `git status --porcelain` shows SOURCE dirt
     (self-generated `artifacts/` churn excluded) so the manifest always
     binds to a clean exact commit.
   - `publish-dry-run.ts`: persists candidates into `artifacts/packages/`,
     re-hashes each persisted copy (drift = hard error), prunes non-manifest
     tarballs, overwrites `checksums.txt` with exactly the 9 candidate rows,
     and writes `candidate-manifest.json`.

3. **Cross-artifact set equality — `release:verify`**:
   - Builds {name, version, tarballFile, sha256} records for all 9 packages
     from FIVE sources: candidate-manifest, checksums.txt, sbom.json release
     components, provenance.json subjects, publish-dry-run plan order — and
     requires byte-level record equality across all of them, plus
     candidate-shape (40-char SHA binding, no absolute paths), on-disk hash
     recompute, plan consistency, namespace clearance, conformance lanes,
     and the htmx-4-experimental pin.

4. **SBOM/provenance describe the publication form**:
   - Both tools read the candidate manifest when present, so release
     components / subjects carry version `0.1.0-alpha.2` and the candidate
     tarball digests instead of source-form `0.0.0`.
   - Gate order updated (`scripts/release-gate.ts`): publish:dry-run builds
     candidates BEFORE sbom/provenance/verify run.

5. **`registry:verify` tool (`tools/release/registry-verify.ts`, script in package.json)**:
   - Preflight: each manifest package's tarball must exist AND its recomputed
     SHA-256 must match the manifest (length-only checks removed).
   - Post-publish: per package asserts registry `version`, license, dist-tag
     → candidate version, lockstep internal dependency ranges, deprecation
     state; optional `--download` fetches the published tarball and compares
     bytes against the candidate SHA-256.

6. **Fake-npm proof tests (`tests/release/publisher-safety.test.ts`)**:
   - Runs the REAL publisher with a shim `npm` on PATH whose `whoami`
     succeeds but whose `publish` writes a tombstone and fails loudly.
   - Asserts `--dry-run` (with token set) completes cleanly and leaves NO
     tombstone → proves authentication cannot bypass dry-run.
   - Also pins unknown-flag rejection (exit 2), latest-tag rejection, and
     missing-manifest abort-before-build.

7. **Public evidence workflow (`.github/workflows/candidate-release.yml`)**:
   - Manual `workflow_dispatch` runs the FULL `ci:release` battery on exact
     merged main and uploads candidate-manifest, checksums, candidate
     tarballs, SBOM, provenance, and dry-run report as immutable artifacts
     bound to the triggering SHA (90-day retention).

8. **README**: `@bundar/forms` row added (9-package table).

## Verification results (this branch, committed tree)

- Full suite: **1,185 pass / 0 fail** across 149 files (incl. 4
  publisher-safety tests with fake-npm non-publication proof).
- Candidate pipeline regenerating at HEAD: `publish:dry-run` 42 checks green;
  SBOM/provenance regenerated FROM the manifest (9 @ 0.1.0-alpha.2).
- `registry:verify -- --preflight`: 9/9 disk-hash matches.
- `release:verify`: ALL checks pass incl. three cross-artifact set-equality
  assertions (checksums/SBOM/provenance identical to manifest).
- tsc/eslint/prettier clean; workflow YAML validated.

## Acceptance criteria

- [x] A: Publisher safety — strict parse, real dry-run guaranteed by test,
      manifest-only publishing, latest-tag guard.
- [x] B: Immutable candidate identity — relative paths, clean-tree/exact-SHA
      binding, single-build candidates consumed everywhere.
- [x] C: Cross-artifact verifier — five-set {name,version,file,sha256}
      equality + plan consistency + SHA-shape checks.
- [x] D: Registry verifier — preflight hash recompute; post-publish tag /
      integrity / lockstep deps / deprecation (+ `--download` byte proof).
- [x] E: Evidence discipline — evidence regenerated from this committed
      implementation BEFORE closure; manual workflow provides public
      full-battery runs bound to the exact main SHA.

Residual risks: post-publish integrity check compares SRI sha512 only when
`--download` is omitted; byte-for-byte proof requires `--download` or the CI
workflow artifacts. Registry-only install journey remains #132 scope.
