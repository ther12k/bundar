# GH-084 verification transcript — package contents, dependencies, licenses, and size audit

## Issue

[GH-084 — Audit package contents, dependencies, licenses, and
size](../../issues/m6/gh-084-audit-package-contents-dependencies-licenses-and-size.md)
(branch `gh-084-package-audit`, worktree `bundar-gh-084`, base commit
`281f568` = main after the GH-083 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; Linux `7.0.0-28-generic` x86_64,
  12 CPUs. No browser involvement (packing audit).

## What changed

- `tools/pack-audit.ts` (new) + `pack:all` / `pack:audit` /
  `licenses:check` / `secrets:scan` scripts (one auditor, four entry
  points — documented substitution so inventory and checks never
  drift): packs all 8 public packages, inventories every tarball
  (files, SHA-256, packed/unpacked sizes), and enforces policy
  fail-closed:
  - content scans: private keys, AWS keys, GitHub tokens, generic
    secret assignments, absolute private paths, source maps, dist/
    artifacts, test fixtures;
  - license fields against the approved SPDX set;
  - per-package size budgets (exceptions need an ADR/release blocker);
  - zero-runtime-dependency claims for core and jsx verified from the
    PACKED manifests (ADR-0011);
  - no external runtime dependencies without an ADR;
  - exports + types entries in every manifest (consumer resolution is
    proven by the GH-081 packed cleanroom).
- `artifacts/packages/bom.json` (machine-readable bill of materials)
  and `artifacts/licenses.json` (attribution) — committed.
- `delivery/gates/package-audit.md`: the audit gate record with the
  measured table.

## Exact commands and exit statuses

1. `bun run pack:audit` — exit 0: 8 packages, 513,125B unpacked total,
   **0 findings**; every package within budget; all MIT; zero-dep
   claims hold; no external runtime deps.
2. `bun run pack:all` / `licenses:check` / `secrets:scan` — exit 0
   (auditor modes).
3. `bun run typecheck` / `lint` / `format:check` — exit 0.
4. `bun test` (full) — exit 0; 827 tests across 101 files, 0 fail.
5. `bun run build` — exit 0; `docs:validate` (216 docs) / `docs:links`
   (1,165 links) — exit 0.

## Acceptance evidence

- **No secret or private test fixture present**: content scans over
  every packed text file (including the vendor assets, with the
  private-path scan scoped appropriately) — 0 findings.
- **All runtime/transitive licenses approved and attributed**: all MIT;
  recorded in artifacts/licenses.json (transitives are workspace-
  internal only at this stage — none external).
- **Package exports resolve under a clean consumer**: manifests carry
  exports+types; the GH-081 cleanroom proves installed resolution
  (typecheck + run from packed tarballs).
- **Size exceptions**: none needed — every package within budget.

## Residual risks and deviations

- Size budgets are generous at alpha (measured ~2–5× headroom);
  tightening belongs to a later release once real consumers weigh in.
- Consumer-resolution proof references the GH-081 cleanroom rather
  than re-running an install here (same packed artifacts).

## Newly unblocked issues

GH-085 (SBOM/checksums build on bom.json) and GH-087 (release notes).
