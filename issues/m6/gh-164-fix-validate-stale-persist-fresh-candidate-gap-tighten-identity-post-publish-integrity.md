---
type: GitHub Issue Specification
title: GH-164 — Fix candidate validation freshness, identity binding, and registry integrity
status: complete
labels:
- release
- p0
- m
issue:
  stable_id: GH-164
  github_number: 164
---

# GH-164 — Candidate integrity correction wave (BR-112)

## Outcome

The candidate release pipeline validates and publishes the same immutable bytes,
records portable evidence, rejects source drift, and requires byte-level
post-publish integrity proof.

## Acceptance criteria

- [x] Fresh temporary candidates are the inputs to every dry-run validation;
      persisted copies are byte-checked before manifest generation.
- [x] Candidate manifest serializes only `{name, version, tarballFile,
      tarballPath, sha256}` and never machine-local paths.
- [x] Candidate identity is bound to a clean current source tree or an ancestor
      whose package-affecting source is unchanged; dirty package source fails.
- [x] Missing SBOM SHA-256 values fail cross-artifact equality rather than being
      filled from the candidate manifest.
- [x] Registry verification requires `--download` for byte-for-byte proof.
- [x] Release workflow asserts input version equals manifest version and keeps
      verification reports on failure.
- [x] Regression tests cover fresh-path selection, serialization, and dirty
      source rejection.
- [x] No credentials are committed, printed, uploaded, or included in artifacts;
      no live registry publication is performed by this issue.

## Verification

See [`evidence/gh-164/verification-transcript.md`](../../evidence/gh-164/verification-transcript.md).

Verified source commits:

- `535c43f4b83743b07357215ecb41251a8ed4dcea`
- `ade0151148940681027f8be81a1a2387be20534d`

Candidate artifacts were regenerated from `ade0151148940681027f8be81a1a2387be20534d`
and passed `publish:dry-run` (42/42), `release:verify`, registry preflight (9/9),
SBOM/provenance/reproducibility, formatting, lint, typecheck, documentation,
architecture, and build checks.

## Closure report

- **Files:** release packer, dry-run validator, cross-artifact verifier, registry
  verifier, guarded publisher, release workflow, maintainer gate docs, release
  regression tests, candidate artifacts, and this evidence.
- **Security:** source drift and stale candidate publication are fail-closed;
  registry integrity requires downloaded SHA-256 comparison; no publish occurred.
- **Remaining gate:** public candidate workflow run and human npm gate #130 remain
  downstream actions and are not falsely claimed complete here.
- **Next unblocked work:** after the public candidate battery is green, maintainer
  human gate #130 controls any live canary publication.
