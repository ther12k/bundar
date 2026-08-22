# GH-088 verification transcript — the v0.1.0-alpha.1 release gate

## Issue

[GH-088 — Run the v0.1.0-alpha.1 release
gate](../../issues/m6/gh-088-run-the-v0-1-0-alpha-1-release-gate.md)
(branch `gh-088-release-gate`, worktree `bundar-gh-088`, base commit
`8b5ef35` = main after the GH-087 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; Chrome for Testing `152.0.7977.8` /
  Playwright Chromium `1237`; Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- Pinned htmx 2.0.10 (stable) / 4.0.0-beta6 (experimental — no GA claim).

## Decision

**GO** for v0.1.0-alpha.1 @ `alpha` dist-tag, recorded in
`artifacts/release/go-no-go.json` with the battery log
(`artifacts/release/ci-release.log`). npm publication is
**pending maintainer credentials** — the guarded `publish:approved`
tool refuses registry access without `BUNDAR_RELEASE_TOKEN` + npm
identity and prints the exact dependency-first plan otherwise; no
partial claims.

## What changed

- `scripts/release-gate.ts` (new) + `ci:release`: the 24-step
  fail-closed release-candidate battery (ci:m4's 40 steps through M4 +
  docs drift, snippets/guides, template/scaffold journeys, all six
  reference-app lanes, the 19-suite E2E matrix, the packed cleanroom,
  performance release+budgets, package audit, SBOM/provenance/
  reproducibility, the 38-check publish dry run, notes checks).
- `tools/release/verify.ts` (new) + `release:verify`: the go/no-go
  preconditions — artifact hashes (8/8), package clearance, stable +
  no-JS lanes from the matrix, htmx-4-experimental-and-non-default
  (adapter maturity + template binding + notes pin).
- `tools/release/publish-approved.ts` (new) + `publish:approved`: the
  guarded publish (token + npm identity or explicit dry-run; stops on
  first failure with an honest partial-state report).
- `delivery/gates/alpha.md`: the gate record (decision, review
  summary across P0/P1/security/clearance/compatibility/performance/
  docs/provenance, approval identity, residual risks).
- `artifacts/release/{go-no-go.json,ci-release.log}`: the machine-
  readable decision + raw battery log.
- The immutable source tag `v0.1.0-alpha.1` and the GitHub release
  carry the verified artifacts and the alpha release notes.

## Exact commands and exit statuses

1. `bun run ci:release` — exit 0; **all 24 release-candidate steps
   passed** (log archived).
2. `bun run release:verify` — exit 0; all four go/no-go preconditions
   hold (8/8 hashes; clearance; 19/19 matrix incl. stable/no-JS;
   htmx4 experimental + non-default).
3. `bun run publish:approved` — exit 0 in DRY-RUN mode: "nothing
   published" + the exact plan (dependency-first, `--tag alpha`).
4. `git status --porcelain` — clean after committing the regenerated
   artifacts (bench/environment/provenance refreshed by the battery;
   committed as the release artifacts).
5. `bun run typecheck` / `lint` / `format:check` — exit 0.
6. `bun test` (full) — exit 0; 827 tests across 101 files, 0 fail.
7. `bun run docs:validate` / `docs:links` — exit 0.

## Acceptance evidence

- **All mandatory M0–M6 gates pass from the release commit**: ci:release
  chains ci:m4 + every M5/M6 gate — 24/24 green, log archived.
- **Package names cleared/reserved**: GH-004 namespace decision +
  GH-086 installability; release:verify enforces the record.
- **Stable lane and no-JS matrix pass**: 19/19 suites (8 stable/no-JS
  lanes) verified by release:verify from the artifact.
- **Artifact hashes match provenance and installed packages**:
  8/8 checksum verification.
- **HTMX 4 remains experimental and non-default**: enforced check.

## Residual risks and deviations

- npm publication awaits maintainer credentials (guarded; no partial
  claims). Everything publish-adjacent is verified from packed
  tarballs (GH-086 cleanroom + dry run).
- Alpha limitations are the release notes' own list.

## Newly unblocked issues

GH-096 (M7 stable htmx 4 — with its milestone's GA-evidence chain).
