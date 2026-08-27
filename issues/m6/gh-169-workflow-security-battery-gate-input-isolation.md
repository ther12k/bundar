---
type: GitHub Issue Specification
title: "GH-169 — Workflow security: battery metadata gate, input interpolation removal, PR/self-hosted isolation, Model B-only docs"
status: complete
labels:
- area:release
- priority:p0
- size:m
issue:
  stable_id: GH-169
  github_number: 169
---

# GH-169 — Workflow-security correction wave (audit wave 9)

## Outcome

The GitHub Actions trust boundary is fail-closed: only a successful,
manually-dispatched Candidate Release Battery on the exact release ref
can supply the candidate; workflow inputs never enter shell source;
untrusted pull-request code never executes on the persistent self-hosted
runners; and maintainer documentation describes no local live-publish
path.

## Background

The ninth external re-audit of main `9dc142e` (public bundle at
`67518bf`, run `33079660969`) found no new runtime P0s and confirmed the
Model B architecture, but flagged four autonomous blockers in the Actions
trust boundary:

1. **P1 — failed battery artifacts selectable.** The battery uploads with
   `if: always()`; the Release workflow checked only artifact existence,
   digest, and headSha — not run conclusion/workflow/event.
2. **P1 — inputs interpolated into shell.** `tag`/`version` were pasted
   into `run:` bodies via `${{ github.event.inputs.* }}` in the
   secret-bearing publish job.
3. **P1 — public PRs on persistent self-hosted runners.** `ci.yml`
   triggers on `pull_request` with every job on `[self-hosted, halotec]`.
4. **P1 — docs offered a local live-publish path** bypassing Model B, and
   `expected_artifact_digest` was optional.

## Requirements

- Both Release jobs fail closed on battery run metadata before any
  artifact access: `status == completed`, `conclusion == success`,
  `event == workflow_dispatch`,
  `path == ".github/workflows/candidate-release.yml"`, and
  `head_sha == GITHUB_SHA`.
- Workflow inputs enter only through `env:` mappings; job-level `if:`
  expressions are the only other permitted context. Tag is allowlisted
  `canary|alpha|beta`; version must match exact semver; battery run ID
  must be numeric; `expected_artifact_digest` is mandatory and must
  match `sha256:<64 hex>` — enforced in BOTH jobs.
- `ci.yml` trust split: `pull_request` events run on ephemeral
  GitHub-hosted `ubuntu-latest`; `push` to main runs on the halotec
  self-hosted runner. Workflow-level default permission is
  `contents: read`; only the verify job elevates `issues: read`; the
  battery workflow declares `contents: read` + `actions: write`; the
  Release publish job declares `actions: write` for its report upload.
- `docs/maintainers/publishing.md` and `delivery/gates/registry.md`
  describe publication ONLY through the Model B workflow; local commands
  are labeled diagnostic rehearsal; rollback uses the same flow.
- Ref alignment is documented: the Release dispatch must target the same
  SHA the battery ran on; docs/evidence commits in between invalidate
  the battery — rerun it on the final ref.

## Acceptance criteria

- [x] A failed, cancelled, in-progress, wrong-workflow, or wrong-SHA
      battery run is rejected before any artifact download.
- [x] No `github.event.inputs` reference appears inside any `run:` body
      (env mappings and job `if:` only), pinned by static tests.
- [x] Arbitrary tags/versions/digests/run IDs are rejected by strict
      format checks in both jobs.
- [x] `pull_request` CI executes only on GitHub-hosted VMs; halotec
      receives trusted `push` events only.
- [x] Maintainer docs contain no local live-publish command and mark
      local rehearsals diagnostic-only; digest input is mandatory.
- [x] Static regression suite `tests/release/workflow-security.test.ts`
      (10 tests) pins all of the above.

## Constraints

- Human gate #130 remains open by design; no credentials configured, no
  npm publication executed.
- The Candidate Release Battery and Release workflows stay on
  GitHub-hosted runners (third-party evidence; credentials).
