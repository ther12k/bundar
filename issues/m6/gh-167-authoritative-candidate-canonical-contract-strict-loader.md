---
type: GitHub Issue Specification
title: GH-167 — Authoritative workflow-artifact candidate, canonical dry-run contract, exact publish order, strict manifest loader
status: complete
labels:
- area:release
- priority:p0
- size:m
issue:
  stable_id: GH-167
  github_number: 167
---

# GH-167 — Candidate authority correction wave (audit wave 8)

## Outcome

The public Candidate Release Battery bundle is the single authoritative
candidate; the human-gated publish job downloads, digest-verifies, and
publishes those exact bytes. The dry-run check contract, publish order,
and candidate manifests are validated against canonical shared modules
that never trust the evidence under audit.

## Background

The eighth external re-audit of merged `af545e8` (battery run
`33064663752`) confirmed the four prior fixes and identified:

1. **P1 — candidate authority split.** The committed/live-publish
   candidate bound to `255614c` differs from the battery-regenerated
   candidate at `af545e8`; gzip tarballs embed timestamps so the public
   run did not prove the committed hash set.
2. **P1 — verifier trusted the declared check count.**
   `{success:true, expectedCheckCount:0, checks:[]}` passed
   `dry-run-checks-pass`.
3. **P2 — publish order checked as set equality.** Any permutation with
   `@bundar/core` first passed.
4. **P2 — standalone publisher bypassed strict manifest validation.**
   Explicit `--manifest` inputs could carry duplicates, extra entries,
   unknown fields, escaping paths, or hash-matching impostor tarballs.

## Requirements

- The successful Candidate Release Battery artifact bundle is the
  authoritative candidate (Model B). The battery records a
  `candidate-identity.json` pinning workflow SHA, source SHA, manifest
  digest, artifact name, and all tarball digests; after upload the job
  records the immutable GitHub artifact digest.
- The human-gated publish workflow takes a `battery_run_id` input
  (plus optional expected artifact digest), downloads that exact bundle,
  verifies identity/version/tag consistency, and publishes only the
  downloaded bytes via `--manifest`/`--tarball-root`.
- A canonical ordered dry-run check contract is defined once
  (`dry-run-contract.ts`): the writer self-checks before emitting, and
  `release:verify` enforces exact count, names, uniqueness, sequence,
  and all-pass statuses — never trusting `expectedCheckCount` from the
  report JSON.
- `release:verify` enforces exact array equality of
  `plan.publishOrder` against `PUBLISH_ORDER`.
- One shared strict manifest loader (`candidate-manifest-loader.ts`)
  enforces portable schema, per-entry version agreement, exact
  release-set equality, path containment, on-disk SHA-256 re-hash, and
  packed tarball identity (exact name/version, not private, lockstep
  internal ranges) for `release:verify`, `publish:approved`, and
  `registry:verify`.
- The stale `0.1.0-alpha.1`/`alpha`/8-package header comment in
  publish-dry-run.ts is corrected.

## Acceptance criteria

- [x] A dry-run report declaring 0/41/43 checks, missing, duplicated,
      unknown, reordered, or failing checks can never pass
      `release:verify`.
- [x] A publish plan whose order is not exactly `PUBLISH_ORDER` fails
      `publish-order-exact`.
- [x] Duplicate/extra/missing manifest entries, escaping tarball paths,
      byte-hash drift, renamed packed identities, private packed
      manifests, and stale internal ranges are all rejected by the
      shared loader before any publisher or verifier consumes them.
- [x] The public battery uploads `candidate-identity.json` inside the
      bundle and records the artifact digest in the run summary.
- [x] The human-gated publish job refuses to run without a battery run
      ID, verifies the artifact digest when supplied, and publishes
      only the downloaded bundle bytes.
- [x] No credential value is committed, printed, uploaded, or included
      in an artifact; no npm publication is executed by this wave.

## Constraints

- Human gate #130 (npm namespace, credentials, protected environment
  approval) remains open by design; this wave performs no live publish.
- No mandatory test is hidden, skipped without reason, or weakened.
