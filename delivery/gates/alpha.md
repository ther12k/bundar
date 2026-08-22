---
type: Release Gate
title: v0.1.0-alpha.1 Release Gate
description: Evidence-backed go/no-go decision for the first public Bundar alpha — all mandatory M0–M6 gates green from the release commit, artifacts verified, approval and publish path recorded.
tags:
- m6
- release
- alpha
- evidence
status: draft
generated:
  by: GH-088 implementation pass
  at: '2026-08-22T00:00:00+07:00'
---

# v0.1.0-alpha.1 release gate (GH-088)

## Decision

**GO** for v0.1.0-alpha.1 on the `alpha` dist-tag, from the release
commit recorded in `artifacts/release/go-no-go.json` (tag
`v0.1.0-alpha.1`). The npm publish step requires maintainer credentials
(`BUNDAR_RELEASE_TOKEN` + npm identity) and executes via the guarded
`publish:approved` tool — it refuses to touch any registry without
explicit approval and states plainly when it did not publish.

## The release-candidate battery (`bun run ci:release`)

24 ordered, fail-closed steps from the release commit: the full ci:m4
battery (40 steps through M4, including both browser lanes, the
dual-dialect fixture, and the security audits), then the M5/M6
additions — documentation generation (drift-free), runnable snippets
and guides, template + scaffold journeys in both dialects, all six
reference-app lanes, the 19-suite dual-dialect E2E matrix, the packed
cleanroom, performance release + regression budgets, the package audit,
SBOM/provenance/reproducibility, the 38-check publication dry run, and
the release-notes checks. Raw log: `artifacts/release/ci-release.log`.

## Go/no-go preconditions (`bun run release:verify`)

- **Artifact integrity**: 8/8 committed provenance checksums match the
  archived tarballs.
- **Package clearance**: the @bundar namespace decision (GH-004) with
  installability proven end-to-end from packed tarballs (GH-086);
  dependency-first publish order recorded.
- **Stable + no-JS lanes**: 19/19 release-matrix suites green,
  including the 8 stable/no-JS lanes.
- **htmx 4 stays experimental and non-default**: adapter maturity
  `experimental`; shipped templates and scaffolds bind htmx 2; the
  release notes pin 4.0.0-beta6 explicitly with the no-GA-claim
  wording (enforced by `release:notes-check`).

## Review summary (P0/P1 defects, security, clearance, compatibility,
performance, docs, provenance)

- **P0/P1 defects**: none open — every M0–M6 issue closed with
  evidence; defects found during development (CSRF 422 rotation, async
  renderer void elements, RCDATA escaping, scaffold export/routes,
  origin-header test-client gap, repository metadata) were fixed in
  their issues and re-verified by the batteries.
- **Security**: the nine fail-closed audits, the cross-cutting matrix,
  both reference-app posture suites, and the workflow-gate suite all
  green inside the battery; the security posture report is committed
  (`artifacts/security/report.json`).
- **Compatibility**: exact pins (Bun ≥ 1.4.0, htmx 2.0.10 stable,
  4.0.0-beta6 experimental) with the six classified beta deviations —
  no GA claims anywhere (notes-check enforced).
- **Performance**: environment-bound results with ratio-based
  regression budgets, stable across probes; no leadership claims.
- **Documentation**: generated API reference (drift-guarded), runnable
  snippets/guides, release notes claims-checked.
- **Provenance**: commit-bound statement, SHA-256 checksums, SBOM
  (118 components), reproducibility proven (8/8) with the gzip-mtime
  nondeterminism documented.

## Approval identity

Recorded in `artifacts/release/go-no-go.json`: the delivery automation
executed the batteries and verified the preconditions above from the
release commit; the human maintainer approves the registry publish by
providing the release token (the guarded tool prints the exact plan
otherwise). No partial claims: npm publication is listed as
**pending maintainer credentials** until `publish:approved` reports
otherwise; the immutable source tag and the GitHub release carry the
verified artifacts.

## Evidence

- [GH-088 verification transcript](../../evidence/gh-088/verification-transcript.md)
- `artifacts/release/{go-no-go.json,ci-release.log}`
- `artifacts/conformance/release-matrix.json` ·
  `artifacts/bench/{alpha.json,environment.json,alpha-budgets.json}`
- `artifacts/packages/{bom.json,checksums.txt}` ·
  `artifacts/sbom/sbom.json` · `artifacts/provenance/**`
- `docs/release-notes/alpha.md`

## Accepted residual risks

- npm publication awaits maintainer credentials (guarded tool; exact
  plan recorded; no partial claims made).
- The alpha's known limitations are the release notes' own list —
  pre-1.0 breaking changes, beta-only htmx 4 (GA revalidation is M7),
  Chrome-lane browser evidence, fixture-vs-production seams.
