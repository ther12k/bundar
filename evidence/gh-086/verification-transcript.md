# GH-086 verification transcript — npm publication dry runs and export-map verification

## Issue

[GH-086 — Run npm publication dry runs and export-map
verification](../../issues/m6/gh-086-run-npm-publication-dry-runs-and-export-map-verification.md)
(branch `gh-086-publish-dry-run`, worktree `bundar-gh-086`, base commit
`8e558ef` = main after the GH-085 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; Linux `7.0.0-28-generic` x86_64,
  12 CPUs. No registry access for @bundar packages (that is the point).

## What changed

- `tools/release/publish-dry-run.ts` (new) + `publish:dry-run` /
  `exports:check` scripts (one auditor, two entry points — documented
  substitution): 38 fail-closed checks —
  1. **Pre-release plan simulation**: version `0.1.0-alpha.1`, dist-tag
     `alpha`, dependency-first publish order (core → jsx → schema →
     security → htmx → testing → cli → create-bundar); every packed
     manifest's @bundar dependencies rewritten to the synchronized
     pre-release version (the form `npm publish` emits).
  2. **Export-map verification in-tarball**: every exports key's
     types/default targets exist; no `workspace:` protocol anywhere; no
     unpublished internal paths (stale inter-dep versions fail);
     license/description/repository metadata (this dry run ADDED the
     missing `repository` field to all 8 manifests — a real gap it
     caught); README ships in every tarball.
  3. **Clean-consumer install**: a second tarball registry with file:-
     linked inter-deps (nested manifests must never point at the
     registry pre-publish — enforced two-pass); `bun install` resolves
     ONLY local tarballs; every documented entry point imports
     (core, jsx, schema, security, htmx root + `/2` + `/4` subpaths,
     testing); the default JSX runtime resolves through the installed
     @bundar/jsx (TSX executes AND typechecks with
     `jsxImportSource: @bundar/jsx`); the CLI executes FROM the
     installed tarball (`bundar info`).
  4. Artifacts: `artifacts/publish-dry-run.{md,json}` (plan + 38
     checks). **No registry publish executed** (out of scope).
- Namespace: `@bundar/*` confirmed from GH-004's clearance; the dry run
  proves the namespace + entry points installable end to end.

## Exact commands and exit statuses

1. `bun run publish:dry-run` — exit 0; **38/38 checks passed** for
   0.1.0-alpha.1 @ alpha.
2. `bun run exports:check` — exit 0 (auditor mode).
3. `bun run test:pack-consumers` — exit 0; 8/8.
4. `bun run pack:audit` — exit 0 (sizes/licenses/contents still green
   after the repository-metadata additions).
5. `bun run typecheck` / `lint` / `format:check` — exit 0.
6. `bun test` (full) — exit 0; 827 tests across 101 files, 0 fail.
7. `bun run docs:validate` / `docs:links` — exit 0.

## Acceptance evidence

- **All documented imports resolve in clean consumers**: the 8 entry
  points (incl. both htmx dialect subpaths) import from installed
  tarballs; TSX compiles through the installed JSX runtime.
- **No workspace protocol or unpublished path leaks**: enforced on
  every packed manifest (both the version-sync form and the nested
  consumer form).
- **The CLI executes from the tarball**.
- **No registry publish occurred**.

## Residual risks and deviations

- The file:-linked consumer registry stands in for real registry
  resolution until the actual publish (GH-088's release gate owns the
  real thing); the version-sync manifests prove the metadata form npm
  will emit.

## Newly unblocked issues

GH-087 (release notes cite the simulated plan).
