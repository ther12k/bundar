# GH-167 verification transcript — single-authority candidate and fail-closed contracts (audit wave 8)

Issue #167 · branch `audit-w8-candidate-authority` · implementation commits
`161cb0e2d1cc12515d0fb3784db0c0780b54abaa` (source),
`020250a586dac4272a18a38b3d44cbc84b52c83e` (candidate artifacts),
`7b27495` (OKF corpus 98).

## Scope

This wave resolves the eighth external re-audit of merged `af545e8`:

- **Model B candidate authority**: the successful public Candidate Release
  Battery bundle is the single authoritative candidate. `ci:release` step
  28 (`release:candidate-identity`) records
  `artifacts/release/candidate-identity.json` pinning workflow SHA, source
  SHA, manifest SHA-256, artifact name, and all nine tarball digests; the
  battery uploads it inside the bundle and records the immutable GitHub
  artifact digest in the run summary. The human-gated `release.yml` now
  REQUIRES `battery_run_id` (plus optional `expected_artifact_digest`),
  downloads that exact bundle in both jobs, verifies digest/identity/tag/
  version consistency, and publishes only the downloaded bytes via the new
  `--manifest`/`--tarball-root` flags; post-publish byte verification
  compares the registry against the bundle manifest.
- **Canonical 42-check contract** (`tools/release/dry-run-contract.ts`):
  the ordered canonical check list is defined once; `publish:dry-run`
  self-checks its emit sequence before writing the report;
  `release:verify` enforces `expectedCheckCount === 42` against the
  constant (never the JSON's own declaration), exact name sequence
  (duplicates/missing/unknown/reordered all fail), and all-pass statuses.
- **Exact publish order**: `publish-order-exact` enforces exact array
  equality of `plan.publishOrder` against `PUBLISH_ORDER`; set equality is
  gone.
- **Shared strict manifest loader**
  (`tools/release/candidate-manifest-loader.ts`): portable schema,
  per-entry version agreement, exact release-set equality (no
  duplicates/missing/extra), repo-relative path containment (rejects `..`
  and absolute paths), on-disk SHA-256 re-hash, and packed tarball
  identity (exact name/version, not private, lockstep internal ranges).
  Consumed by `release:verify`, `publish:approved`, and `registry:verify`.
- Stale `0.1.0-alpha.1`/`alpha`/8-package header comment corrected.

## Environment

- Bun 1.4.0 (`34cbb9a40`), TypeScript 6.0.3, ESLint 10.8.1, Prettier
  3.9.6, Linux x64
- Candidate: `0.1.0-alpha.2` on `canary`, 9 packages, dependency-first

## Verification commands and results

1. `bunx tsc --noEmit -p tsconfig.json` — pass.
2. `bun run lint` — pass.
3. `bun run format:check` — pass.
4. `bun test` — **1,207 pass, 0 fail** across 151 files (includes 12 new
   wave-8 tests in `tests/release/candidate-authority.test.ts` and the
   re-green publisher-safety suite).
5. `bun test tools/okf-validator/okf-validator.test.ts` — 10 pass with
   corpus count 98 (GH-167 spec included).
6. `bun run publish:dry-run` — 42 checks passed; writer-side contract
   guard silent (emitted sequence == canonical contract).
7. `bun run pack:audit` — within policy; `bun run release:sbom` — 125
   components; `bun run release:provenance` — 9 subjects bound to
   `161cb0e2d1`; `bun run release:reproduce` — 9 packages reproducible;
   `bun run release:notes-check` — passed.
8. `bun run release:verify` — **all 13 checks pass**, including new
   `publish-order-exact` (exact array equality), `candidate-packed-identity`
   (all 9 packed manifests verified), and `dry-run-checks-pass` (canonical
   contract enforced, declared counts never trusted).
9. `bun run release:candidate-identity` — single-authority record written
   (see identity below).
10. `bun run registry:verify -- --preflight` — 9/9 on-disk SHA-256
    matches via the shared loader.
11. `bun run ci:release` — all 28 steps pass locally (log in transcript
    appendix).

## Single-authority candidate identity (local `ci:release` run)

The full 28-step battery regenerated the candidate at clean HEAD
`7b27495f60b03182ecccbbbccaad50daced435d1` (source commit `161cb0e` is an
ancestor with no package-affecting changes — Model B ancestor rule), and
step 28 recorded:

- `candidateSourceSha` = `workflowRunSha` =
  `7b27495f60b03182ecccbbbccaad50daced435d1`
- `candidateManifestSha256` =
  `830fabe52e153eaa8614e29775a899abf366e96b4f475292a1368cd588a84b2d`
- `version` = `0.1.0-alpha.2`, `distTag` = `canary`
- Tarball SHA-256 (this local build):
  - `@bundar/core`: `aea03304…` (full digests inside
    `artifacts/release/candidate-identity.json` at the recording commit)
  - `@bundar/jsx`: `cd1aab99…`
  - `@bundar/schema`: `1a063654…`
  - `@bundar/forms`: `d4320311…`
  - `@bundar/security`: `ce57792d…`
  - `@bundar/htmx`: `db775c74…`
  - `@bundar/testing`: `63764f54…`
  - `@bundar/cli`: `78c483c1…`
  - `create-bundar`: `a4298be4…`

Note: gzip tarballs embed timestamps, so tarball digests differ between
builds even with identical unpacked content — which is exactly why Model B
pins ONE battery bundle as authoritative instead of comparing local vs
remote builds. The battery-regenerated `candidate-identity.json` (uploaded
inside the artifact bundle) is the record the human publish job verifies.

## Acceptance criteria

- [x] Dry-run reports declaring 0/41/43 checks, or missing/duplicated/
      unknown/reordered/failing checks, can never pass `release:verify`.
- [x] Publish plans not exactly equal to `PUBLISH_ORDER` fail
      `publish-order-exact`.
- [x] Duplicate/extra/missing manifest entries, escaping paths, byte-hash
      drift, renamed packed identities, private packed manifests, and
      stale internal ranges are rejected by the shared loader before any
      publisher or verifier consumes them.
- [x] The public battery uploads `candidate-identity.json` inside the
      bundle and records the artifact digest in the run summary.
- [x] The human-gated publish job refuses to run without a battery run
      ID, verifies the artifact digest when supplied, and publishes only
      the downloaded bundle bytes.
- [x] No credential value is committed, printed, uploaded, or included in
      an artifact; no npm publication is executed by this wave.

## Public release battery run (authoritative candidate)

- **Workflow**: `candidate-release.yml` (Candidate Release Battery)
- **Run ID**: `33079660969`
- **Run URL**: https://github.com/ther12k/bundar/actions/runs/33079660969
- **Head commit (workflow run SHA = candidate source SHA)**:
  `67518bf6bc9ec8bf717181394d2c8364b5f19b50`
- **Conclusion**: `success`
- **Bundle artifact**:
  `release-candidate-artifacts-67518bf6bc9ec8bf717181394d2c8364b5f19b50`
- **GitHub artifact digest**:
  `sha256:1301cbc08c946d712e9812eab630aed2d7305fa8fe7123d95adce67b34af5638`
- **candidateManifestSha256**:
  `9d902f35f1135dc66bd0062ed3fbf8f34d700f0003778143840a0f77deca50be`
- **version @ dist-tag**: `0.1.0-alpha.2` @ `canary`
- **Tarball SHA-256** (from `candidate-identity.json`, re-verified by the
  shared loader on the downloaded bundle):
  - `@bundar/core`: `bf288fef07b56241f4bd8c0bdff317a757c7d750da008272dd8ce74339014284`
  - `@bundar/jsx`: `c83799becb0be47ea3fd746cc0ed90ee16f0a74f007f41be7bea774e66a1c761`
  - `@bundar/schema`: `eb38926f50f612b5c3a7dca0901c1fb73b31d59eb3a74a8d35acdbd8722ddf52`
  - `@bundar/forms`: `9c233a041d55c2e1167b059892191c73efe7f0b48f1f224a8a23c95a39b2d5f2`
  - `@bundar/security`: `b207835bf9257b21878d4f847e7972702839e3dffc86f685b4c26d435683e206`
  - `@bundar/htmx`: `28d61abc1f1f580656cb187e3f9fcd0a9ec0270b5de849ffd98a89f62c391adb`
  - `@bundar/testing`: `da081d28fa855d8b4cff51604972d2c78165ae23ba7dd202a5f46bd33188c3bf`
  - `@bundar/cli`: `40055225d0469cb301583e9678a9d876a9871ff9c2cc8702ae542411505e15b8`
  - `create-bundar`: `e73bba76adda9db58e19c5f138b575d20828cc38fc95211b2ebcde0493402219`

### Model B end-to-end rehearsal (from the downloaded public bundle)

The bundle was downloaded via `gh run download` (run `33079660969`) and
the maintainer publish path was rehearsed offline:

1. `publish:approved --dry-run --manifest
   <bundle>/artifacts/release/candidate-manifest.json --tarball-root
   <bundle>` — exit 0; shared-loader verification passed (schema, exact
   set, containment under the bundle root, byte-hash equality, packed
   identity); plan printed in dependency-first order; nothing published.
2. `registry:verify --preflight --manifest <bundle>/... --root-dir
   <bundle>` — 9/9 on-disk SHA-256 matches.

This rehearsal caught one real integration bug before any maintainer
touchpoint: upload-artifact v4 stores entries relative to the least
common ancestor of the search paths, so the first battery bundle
(run `33078743333` at `aeeaf26`) extracted at the `artifacts/` level and
the publish job's `candidate-bundle/artifacts/...` layout would have
failed at first real use. Fixed on main (`67518bf`) by listing
root-level `package.json` in the upload so the bundle mirrors the repo
layout; the succeeding run above is from the fixed workflow.

All five identity components — candidate source SHA, workflow run SHA,
manifest SHA-256, GitHub artifact digest, and the nine tarball SHA-256
values — point at this single bundle.

## Residual risks and gates

- Human gate #130 remains open by design (npm namespace, credentials,
  protected environment approval). The publish workflow's new
  `battery_run_id` requirement means the maintainer handoff is now:
  run the battery, copy the run ID + artifact digest, trigger
  Release (human-gated) with those values.
