# GH-171 verification transcript — release hygiene (audit wave 10)

Issue #171 · branch `audit-w10-release-hygiene` · PR #172 (merge
`4a1d22f`) plus follow-up deflake commits `c51bead`, `5ae38dc`, `3c6361e`,
`864437b` on main.

## Scope

The tenth re-audit of `edf467e` accepted the GH-169 closure and left:

1. **Trusted-ref defense-in-depth (P1 → gate #130).** Both Release jobs now
   gate on `github.ref == 'refs/heads/main'`; the battery metadata gate
   additionally requires `head_branch == "main"` in both jobs — a
   same-SHA pair from a feature branch is rejected. The primary boundary
   is the `npm-publish` environment deployment-branch policy: documented
   as mandatory in `delivery/gates/registry.md` prerequisite 6 (protect
   main; deployment branches restricted to protected main; required
   reviewer; prevent self-review; evidence recorded in #130) and the
   publishing guide; the four acceptance checkboxes were posted to
   #130. Note: `main` is currently `protected: false` — protection is a
   maintainer action inside gate #130.
2. **Stale preflight-report upload (P2).** The publish job deletes the
   committed `artifacts/registry-verify.json` before any auth/publish
   step; the `if: always()` upload can then only carry a report written
   by the current attempt. A failed auth/publish can no longer upload a
   stale `success: true` preflight report.
3. **Publish-job least privilege.** Demoted to `contents: read` +
   `actions: read` (upload-artifact uses the job runtime token; no
   GITHUB_TOKEN write scope adjacent to npm credentials). Static guard
   asserts no `actions: write` remains in release.yml.

## Follow-up hardening surfaced by the halotec migration (disclosed)

Merging exposed two real test-suite races on the loaded self-hosted
runner, both fixed rather than skipped:

- **Transient tar-spawn failures**: `spawnSync('tar')` under fork
  pressure returned null status and the wave-8 loader reported
  "cannot read package/package.json" for a valid candidate
  (main CI run `33136239880`). Spawn-level failures are now retried
  (3×, 0.4 s apart); real archive errors still reject immediately with
  the tar diagnostic (pinned by `wave 10: loader resilience`).
- **Source-identity race**: the dirty-source test mutated
  `packages/core/src/index.ts` while concurrently-running publisher
  tests read the same worktree via `candidateSourceIdentity` (main CI
  run `33136598548`). All tests that mutate package-affecting source or
  spawn the publisher now serialize behind a shared identity lock with
  a 120 s staleness break; lock users carry 30 s budgets.
- **Date-header flake (pre-existing)**: the core static-fast-path test
  compared per-request Date headers byte-for-byte across two fetches;
  straddling a second boundary failed it. It now asserts a well-formed
  date instead (per-request timestamps are not a static invariant).

## Static regression suite

`tests/release/workflow-security.test.ts` — 14 guards (input hygiene,
metadata gate incl. head_branch, gate-before-download ordering, ref
guards, no write escalation, PR/hosted split, Model B-only docs,
report-clear-before-auth ordering). `candidate-authority.test.ts` grew
the loader-resilience regression. Full suite 1,222 pass / 0 fail
locally; lint/typecheck/format/OKF corpus 100 green.

## Authoritative battery identity (final ref `864437b`)

- **Battery run**: `33137662191` —
  https://github.com/ther12k/bundar/actions/runs/33137662191 (`success`)
- **Publish-gate metadata check incl. head_branch == main**: ACCEPTED
- **Bundle artifact**:
  `release-candidate-artifacts-864437bac1118e11d94f7b680260a0b7bf20d867`
- **GitHub artifact digest**:
  `sha256:56f892a2ca92ec3be1cc372e54a501a64391516b9c5b7d4674b7e96b47084fe9`
- **candidateManifestSha256**:
  `8f91b18037937b6e63b220c2ca1f7008dd87d89efd22c3c99e2afa0ab8dc3ee6`
- **version @ dist-tag**: `0.1.0-alpha.2` @ `canary`
- Tarball digests (full values in the bundle's candidate-identity.json):
  core `711914de54affe08…`, jsx `fa93cf248f5cde05…`,
  schema `916943d62ede7689…`, forms `d8d8e3e981f5cc69…`,
  security `9726e2664f3059a9…`, htmx `198796bb16074ef9…`,
  testing `fdf1e147992d5ec5…`, cli `2d9eb5d3e0393e44…`,
  create-bundar `837350523473087d…`

### Publish-path rehearsal (downloaded bundle, at the release ref)

`publish:approved --dry-run --manifest/--tarball-root <bundle>` — exit 0
through the shared loader; `registry:verify --preflight
--manifest/--root-dir <bundle>` — 9/9. Nothing published.

## Main-branch CI evidence

- `33137157296` @ `3c6361e` — exposed the lock-timeout budget; fixed.
- `33137432181` @ `864437b` — **success** on the halotec runner (push
  event), all five jobs green with the race and budget fixes in place.
- Battery `33137662191` @ `864437b` — success (GitHub-hosted, third-party).

## Residual risks and gates

- Gate #130 remains the human gate: namespace, credentials/trusted
  publishing, branch protection + environment deployment policy (new
  mandatory acceptance), approval. No credentials were configured and
  no npm publication was executed in this wave.
- The host-local dev-loop flake observed during development was traced
  to machine-level inotify exhaustion (an unrelated dotnet workload
  holds most instances); it is not a repository defect and the suite is
  green in CI and locally when watcher slots are available.
