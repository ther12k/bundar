---
type: GitHub Issue Specification
title: "GH-171 — Release hygiene: trusted-ref defense-in-depth, stale report removal, publish-job least privilege"
status: complete
labels:
- area:release
- priority:p1
- size:s
issue:
  stable_id: GH-171
  github_number: 171
---

# GH-171 — Release-hygiene correction wave (audit wave 10)

## Outcome

The exact-SHA release gate is hardened with trusted-ref defense-in-depth,
failed publishes can no longer upload a stale preflight success report,
and the credential-bearing publish job holds no GITHUB_TOKEN write scope.
The primary trusted-ref boundary — the `npm-publish` environment
deployment-branch policy — is recorded as mandatory gate #130 acceptance.

## Background

The tenth re-audit of `edf467e` accepted the GH-169 closure and found:

1. **P1 → #130 — "same SHA" is not "trusted ref".** The metadata gate did
   not check that the battery ran on `main`; workflow_dispatch accepts
   arbitrary branches. The strongest boundary is the environment
   deployment branch policy (out-of-band configuration, unverifiable from
   a public repository).
2. **P2 — stale preflight report upload.** The publish job's
   `if: always()` upload could collect the committed
   `artifacts/registry-verify.json` (preflight, `"success": true`) after
   a failed auth/publish, inviting misinterpretation.
3. **Least privilege** — the publish job held `actions: write` next to
   npm credentials although upload-artifact uses the job runtime token.

## Requirements

- Both Release jobs gate on `github.ref == 'refs/heads/main'`; the
  battery metadata gate additionally requires `head_branch == "main"` in
  both jobs.
- The publish job deletes the committed registry report before any
  auth/publish step; the `if: always()` upload can then only pick up a
  report written by the current attempt.
- Publish job permissions demoted to `contents: read` + `actions: read`.
- `delivery/gates/registry.md` prerequisite and `docs/maintainers/publishing.md`
  document protecting `main`, restricting the environment's deployment
  branches to protected `main`, and required-reviewer/prevent-self-review
  configuration, with evidence recorded in #130.

## Acceptance criteria

- [x] A battery run from a non-main branch is rejected by the metadata
      gate; Release jobs refuse non-main refs.
- [x] A failed auth/publish can never upload a stale successful-looking
      registry report (statically pinned, including upload ordering).
- [x] No `actions: write` scope remains anywhere in release.yml.
- [x] The deployment-branch policy and reviewer configuration are
      documented as mandatory and tracked in gate #130.

## Constraints

- Human gate #130 remains open; no credentials configured, no npm
  publication executed by this wave.
