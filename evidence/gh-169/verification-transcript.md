# GH-169 verification transcript — workflow security (audit wave 9)

Issue #169 · branch `audit-w9-workflow-security` · implementation commit
`95fd694`, merged to main via PR #170 (merge `386f60e`).

## Scope

The ninth external re-audit (main `9dc142e`, public bundle at `67518bf`)
confirmed the Model B architecture and found four remaining autonomous
blockers, all in the GitHub Actions trust boundary:

1. **Failed-battery artifact selection** — the battery uploads its bundle
   with `if: always()`; the Release workflow previously checked only
   existence/digest/headSha. Now BOTH jobs fetch the run's metadata and
   fail closed before any artifact access unless: status `completed`,
   conclusion `success`, event `workflow_dispatch`, workflow path
   `.github/workflows/candidate-release.yml`, and head SHA equal to the
   dispatch SHA.
2. **Input interpolation** — `github.event.inputs.*` now appears only in
   `env:` mappings (plus job-level `if:` conditions, which are GitHub
   expression context, not shell source). The publish job's shell reads
   `$INPUT_TAG`; a malicious input can no longer splice commands next to
   npm credentials. Validation hardened: tag allowlist `canary|alpha|beta`
   (previously only `latest` was rejected), exact-semver version, numeric
   run ID, mandatory `sha256:<64 hex>` artifact digest — in both jobs.
3. **Public PRs on persistent self-hosted runners** — `ci.yml` now routes
   `pull_request` events to ephemeral GitHub-hosted `ubuntu-latest` VMs;
   only trusted `push` to main runs on the halotec runner. Verified
   empirically: the PR's five CI jobs all executed on `runner=GitHub
   Actions` (`ubuntu-latest`), and the post-merge main push landed on
   `halotec-runner-b`. Least privilege: workflow default
   `permissions: contents: read`; only the verify job elevates
   `issues: read` (its live `issues:check`); the battery declares
   `contents: read` + `actions: write`; the publish job `actions: write`.
4. **Docs bypassing Model B** — `docs/maintainers/publishing.md` and
   `delivery/gates/registry.md` now describe publication ONLY through the
   human-gated Release workflow consuming the authoritative bundle; local
   commands are labeled `DIAGNOSTIC REHEARSAL ONLY`; rollback routes
   through the same flow; the ref-alignment rule (no docs/evidence
   commits between the battery run and the Release dispatch — the SHA
   gate rejects them; rerun the battery on the final ref) is documented
   in the workflow header and both guides, and `expected_artifact_digest`
   is a mandatory input.

## Static regression suite

`tests/release/workflow-security.test.ts` — 10 guards pinning: input
hygiene (env-only), mandatory digest, allowlists, metadata-gate markers
in both jobs, gate-before-download ordering, PR/hosted runner split,
workflow-level permissions, battery permissions, and Model B-only docs.

## Environment

- Bun 1.4.0 (`34cbb9a40`), TypeScript 6.0.3, ESLint 10.8.1, Prettier
  3.9.6, Linux x64
- OKF corpus 99 documents

## Verification commands and results

1. `bun test` — **1,217 pass, 0 fail** across 152 files.
2. `bun run format:check` / `lint` / `typecheck` — pass.
3. `bun run docs:check && docs:validate && docs:links` — 236 documents,
   1,263 links, 99 issues — pass.
4. PR #168-style CI on the wave branch: CI + Docs green; all five CI jobs
   executed on GitHub-hosted runners (pull_request trust split verified).
5. Post-merge main CI run `33107561280`: success; push event routed to
   the halotec self-hosted runner (`halotec-runner-b`) as designed.
6. Public Candidate Release Battery on the final ref — see identity
   record below.
7. Publish-gate acceptance rehearsal against the new battery run
   (metadata gate + download + loader dry-run + registry preflight) —
   see below.

## Authoritative battery identity (final ref `386f60e`)

- **Battery run**: `33107916170` —
  https://github.com/ther12k/bundar/actions/runs/33107916170 (`success`,
  workflow_dispatch, candidate-release workflow, head `386f60e`)
- **Publish-gate metadata check**: ACCEPTED (all five conditions pass —
  the same gate the Release workflow enforces before touching any
  artifact; failed/cancelled/wrong-workflow/wrong-SHA runs are rejected)
- **Bundle artifact**:
  `release-candidate-artifacts-386f60eb8fb13591653993991b1135151570a77b`
- **GitHub artifact digest**:
  `sha256:c364f916ba51064a8aee345201496bfbcfedeb6c987b10e92e1f09d5a8b21193`
- **candidateManifestSha256**:
  `076d6d9b505a426a80f04078c93bc934923d65b08ca3efcd7a8eddfb4c16a6c1`
- **version @ dist-tag**: `0.1.0-alpha.2` @ `canary`
- **Tarball SHA-256** (from `candidate-identity.json` in the bundle):
  - `@bundar/core`: `b38fc86748f6d867a05994b4f39f6f9df4ad02ef80e9baeca2ac434226f6419e`
  - `@bundar/jsx`: `9c90ce7b5046f19134f62e1443fb045d591b1eca1fbf45271f0f8d1e443534c1`
  - `@bundar/schema`: `f9173d659bea167629706522229c2e42c782d923d877110000fd7d8e05a839f8`
  - `@bundar/forms`: `a1dc52ecf4e14868478b81e5bcaf083f1836b3e6197f888d54452d0acd08fd88`
  - `@bundar/security`: `11e5cb8989cda6b50d41d8fac877c6b79f94e01b1b882869d20eb27fe6428d31`
  - `@bundar/htmx`: `66a511164d7d34f86fc3e23f700ccc181acd54505ddf65996e9ec6d4e2540f35`
  - `@bundar/testing`: `19864a825006cb09af59cb2d34cc6e3dbb3cd2f6fc79eb1aa3c6338877866204`
  - `@bundar/cli`: `9b8b783e8b0d008075a4b5b1d0b7a12170aa08963c982c379cd5a47b1893ff42`
  - `create-bundar`: `9f59477f0365778d2dbf4f1237eede0b17e74a7e7ca3d40284035a323d05b1c7`

### Publish-path rehearsal (from the downloaded bundle, at the release ref)

1. Metadata gate — ACCEPTED (identical to the workflow's check).
2. `publish:approved --dry-run --manifest <bundle>/artifacts/release/candidate-manifest.json
   --tarball-root <bundle>` from a clean checkout at `386f60e` — exit 0
   through the shared loader; nothing published. (Run from the release
   ref: the loader's ancestor check requires the manifest SHA to be HEAD
   or an unchanged ancestor — exactly what the dispatch-SHA gate
   guarantees inside the workflow.)
3. `registry:verify --preflight --manifest/--root-dir <bundle>` — 9/9.

## Ref-alignment handoff note

This evidence commit lands AFTER battery `33107916170`, so main's tip
moves past `386f60e`. By design the Release workflow will then reject
that battery (head_sha mismatch) and require a fresh battery on the
final ref. Before any publication the maintainer must: (1) dispatch the
Candidate Release Battery on the current main tip, (2) copy that run's
ID + digest from the summary, (3) dispatch Release on the same ref.
This is the audit-endorsed fail-closed behavior, documented in the
workflow header and both maintainer guides.

## Residual risks and gates

- Human gate #130 remains open by design. Publication happens only
  through the Release workflow after the maintainer configures the
  npm-publish environment and secrets. No credentials were configured,
  printed, or committed in this wave; no npm publication was executed.
- The halotec runner executes trusted main-branch code only. It remains
  a persistent runner by design choice of the maintainer; the audit's
  stricter alternative (per-job JIT ephemeral runners) is documented in
  issue #169 as a future hardening option.
