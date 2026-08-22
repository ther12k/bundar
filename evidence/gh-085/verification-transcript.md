# GH-085 verification transcript — SBOM, provenance, checksums, and reproducible build evidence

## Issue

[GH-085 — Generate SBOM, provenance, checksums, and reproducible build
evidence](../../issues/m6/gh-085-generate-sbom-provenance-checksums-and-reproducible-build-evidence.md)
(branch `gh-085-sbom-provenance`, worktree `bundar-gh-085`, base commit
`96b4b57` = main after the GH-084 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; Linux `7.0.0-28-generic` x86_64,
  12 CPUs. Identity: local builder (CI identity fields recorded when
  GitHub Actions runs; none claimed here).

## What changed

- `tools/release/sbom.ts` (new) + `release:sbom`: CycloneDX 1.5 JSON
  SBOM at `artifacts/sbom/sbom.json` — the 8 release packages (from the
  GH-084 audited BOM, with SHA-256 hashes and licenses) plus all 110
  lock-resolved externals (direct + transitive runtime/build deps:
  typescript, eslint chain, hono parity fixture, zod, valibot, yaml,
  prettier…), with a dependency graph (workspace edges + root build
  deps) and the lockfile SHA-256 property. bun.lock's JSONC form
  (comments + trailing commas) is normalized before parsing.
- `tools/release/provenance.ts` (new) + `release:provenance`: an
  in-toto-style/SLSA-v0.2-shaped provenance statement
  (`artifacts/provenance/provenance.json`) binding all 8 tarballs
  (fresh SHA-256 each run) to the source commit, branch, Bun/TS
  versions, lockfile digest, build command, and builder identity
  (GitHub Actions fields when in CI; local identity recorded here).
  Tarballs archived to `artifacts/packages/*.tgz` with
  `checksums.txt` (sha256sum-compatible, repo-root-relative).
- `tools/release/reproduce.ts` (new) + `release:reproduce`: clean-rebuild
  comparison — every package packed twice in independent runs, unpacked
  trees compared file-by-file (SHA-256). `artifacts/provenance/
  reproducibility.json` records the method and the DOCUMENTED
  nondeterminism: tarball gzip bytes embed mtimes (not byte-comparable
  across runs); content trees are and must be identical.
- Signing: the repo's current capability is unsigned attestations with
  recorded identity — no formal supply-chain assurance level is claimed
  (out of scope per the issue); the statement structure wraps a future
  signing workflow without reformatting.

## Exact commands and exit statuses

1. `bun run release:sbom` — exit 0; 118 components (8 packages + 110
   externals), 9 dependency nodes.
2. `bun run release:provenance` — exit 0; 8 subjects bound to commit
   `96b4b576db…` (identity: local).
3. `bun run release:reproduce` — exit 0; 8/8 packages reproducible
   (unpacked trees byte-identical across runs).
4. `sha256sum -c artifacts/packages/checksums.txt` — 8/8 OK (the
   issue's `sha256sum artifacts/packages/*.tgz` shape).
5. `bun run typecheck` / `lint` / `format:check` — exit 0.
6. `bun test` (full) — exit 0; 827 tests across 101 files, 0 fail.
7. `bun run docs:validate` (217 documents) / `docs:links` (1,165
   links) — exit 0.

## Acceptance evidence

- **Every tarball has a checksum and provenance link**: checksums.txt
  + the provenance statement's `subject` array (name + sha256).
- **SBOM includes direct and transitive runtime/build dependencies**:
  110 lock-resolved externals + 8 workspace components with graph edges.
- **Build needs no undocumented network resources**: packing is
  offline (`bun pm pack` from the verified workspace; the cleanroom
  and CI batteries prove install-time requirements are the public
  registry only for @types/bun/typescript).
- **Reproducibility deviations understood and documented**: gzip
  mtime nondeterminism recorded; content trees proven identical.

## Residual risks and deviations

- Unsigned attestations at current repo capability (documented above).
- Local-builder identity for this run; CI identity fields populate
  automatically in GitHub Actions.

## Newly unblocked issues

GH-086 (publication dry runs reuse the checksummed artifacts) and
GH-087 (release notes cite the provenance manifest).
