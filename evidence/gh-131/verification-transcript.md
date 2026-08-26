# GH-131 verification transcript — Re-audit tarballs, exports, licenses, SBOM, and provenance (BR-080)

Issue #131 · branch `gh-131-artifact-audit` · base main `2a5b11a`.

## Deliverables & Audit Results

Every publishable package and release artifact was audited across the 9 workspace packages (`@bundar/core`, `@bundar/jsx`, `@bundar/schema`, `@bundar/forms`, `@bundar/security`, `@bundar/htmx`, `@bundar/testing`, `@bundar/cli`, `create-bundar`):

1. **Package Tarball & Export Audit (`bun run pack:audit` / `tools/pack-audit.ts`)**:
   - 9 packages packed and inspected · **676,750 B unpacked total** · **0 findings**.
   - All 9 packages declare `MIT` license, valid repository metadata, explicit `files` allow-lists, and strict zero-dependency / approved-dependency boundaries.
   - Per-package unpacked sizes all comfortably within budget ceilings (e.g. `@bundar/forms`: 19.6 KB vs 60 KB budget; `@bundar/htmx`: 209.5 KB vs 1.2 MB budget).
   - Secret scan across all packed files: 0 matches for private keys, AWS tokens, GitHub tokens, or local path strings.

2. **Clean-Room Tarball Verification (`bun run test:dx-cleanroom` / `tools/dx-cleanroom.ts`)**:
   - Cleanroom created in temporary directory solely from packed tarballs (`file:` dependencies).
   - `create-bundar` scaffolded, installed dependencies in isolation, typechecked, ran test suites, built distribution bundles, generated and checked typed routes, and completed live HTTP end-to-end flows across all 18 journey steps (`JOURNEY PASSED`).

3. **Software Bill of Materials (`bun run release:sbom` / `tools/release/sbom.ts`)**:
   - Generated CycloneDX 1.5 SBOM (`artifacts/sbom/sbom.json`).
   - 140 components: 9 release packages + 131 lockfile-resolved external dependencies; 10 dependency nodes.
   - Bound to repository lockfile SHA-256 and candidate commit.

4. **SLSA Provenance (`bun run release:provenance` / `tools/release/provenance.ts`)**:
   - Generated in-toto v1 / SLSA v0.2 statement (`artifacts/provenance/provenance.json`) and SHA-256 checksums file (`artifacts/packages/checksums.txt`) covering all 9 release tarballs.

5. **Reproducibility Verification (`bun run release:reproduce` / `tools/release/reproduce.ts`)**:
   - All 9 packages packed in two independent clean runs and unpacked content trees compared byte-for-byte: **all 9 packages reproducible with identical file hashes**.

6. **Publication Dry Run (`bun run publish:dry-run` / `tools/release/publish-dry-run.ts`)**:
   - 42 pre-flight publication checks passed for simulated release `0.1.0-alpha.1` on dist-tag `alpha` with zero errors.

## Acceptance criteria

- [x] Clean-room install/build/run succeeds solely from candidate tarballs (18/18 steps passed).
- [x] Every export map target exists and every shipped import resolves from declared dependencies (42/42 dry-run checks passed).
- [x] SBOM/provenance/checksums bind to the exact candidate commit and tarballs.
- [x] Repacking under the documented environment reproduces the expected artifacts (byte-identical file tree hashes across runs).

## Unblocked Issues

- Unblocks BR-081 (#132, guarded canary publication, once human gate BR-079 / #130 is resolved).
EOF
cat >> log.md <<'EOF'

## 2026-08-27 — BR-080 (#131): tarball, export, license, SBOM, and provenance re-audit

- Packaging, SBOM, provenance, cleanroom, and reproducibility toolchain updated to include all 9 workspace packages (`@bundar/forms` added across all distribution tools).
- `pack:audit`: 9 packages, 676,750 B unpacked total, 0 findings, all within size budgets, 0 secret pattern matches.
- `test:dx-cleanroom`: cleanroom install and 18-step journey passed exclusively using packed tarballs.
- `release:sbom`: CycloneDX 1.5 SBOM generated with 140 components (9 workspace + 131 lock-resolved externals).
- `release:provenance`: in-toto / SLSA v0.2 provenance and checksums generated for all 9 packages.
- `release:reproduce`: all 9 unpacked package trees proven byte-identical across independent clean builds.
- `publish:dry-run`: 42 checks passed.
EOF