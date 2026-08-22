# GH-082 verification transcript — complete dual-dialect end-to-end matrix

## Issue

[GH-082 — Run the complete dual-dialect end-to-end
matrix](../../issues/m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md)
(branch `gh-082-dual-matrix`, worktree `bundar-gh-082`, base commit
`8d551ce` = main after the GH-081 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; Chrome for Testing `152.0.7977.8` /
  Playwright Chromium `1237`; Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- Exact pinned upstream assets: htmx 2.0.10 (SHA-256 `71ea6718…5c0de`,
  stable) and 4.0.0-beta6 (SHA-256 `28fae7bb…40d25`, experimental — no
  GA claim), served from the verified local vendor registry.

## What changed

- `tools/e2e-release.ts` (new) + `test:e2e:release` /
  `conformance:release-report` scripts: the fail-closed matrix
  orchestrator — 19 suites across the full surface:
  - template/minimal × {htmx2, htmx4}; examples/todo × {htmx2, htmx4,
    no-js}; examples/admin-crud × {htmx2, htmx4, no-js};
    examples/workflow-gate (session+CSRF+flash+error negotiation);
    scaffold × {htmx2, htmx4-experimental};
  - real-browser lanes (htmx2 + htmx4 + dual parity) covering
    normal/boosted/history request negotiation, forms, errors, OOB,
    uploads, and indicators;
  - the security matrix (9 audits), reference-workflow and
    admin-posture suites; the shared-source guard; the new
    accessibility smoke.
- `tests/e2e/accessibility-smoke.test.ts` (new, 3 tests): aria-live
  flash, labeled form controls, alert-role validation slots — asserted
  in-process on the reference app markup.
- `artifacts/conformance/release-matrix.json` (new, machine-readable):
  per-suite {status, ms}, pinned-asset manifest, summary, and the
  classified experimental-lane deviations derived from the pinned beta
  profile's own `migrationDifferences`/`unsupported` records — never
  counted as stable-pass.

## Exact commands and exit statuses

1. `bun run test:e2e:release` — exit 0; **19/19 suites passed**
   (~6 min wall). Per-lane details in the artifact (browser lanes ~2–3
   min each; app lanes sub-second to ~1.7 s).
2. `bun run conformance:release-report` — exit 0 (same battery;
   regenerates and re-verifies the artifact).
3. `bun run htmx:source-diff` — exit 0 (20 application files, zero
   dialect conditionals, no raw protocol strings).
4. `bun run typecheck` / `lint` / `format:check` — exit 0.
5. `bun run architecture:check` — exit 0; `api:check` — exit 0.
6. `bun run build` — exit 0; `docs:validate` (216 documents) /
   `docs:links` (1,165 links) — exit 0.
7. `bun test` (full) — exit 0; 827 tests across 101 files (the 3
   accessibility tests included), 8,320 expect() calls, 0 fail, 0
   unexplained skips.

## Acceptance evidence

- **Stable htmx 2 + no-JS mandatory scenarios pass**: every htmx2 and
  no-js lane green across all four reference surfaces + browsers.
- **Shared app source guard passes**: htmx:source-diff green; the
  htmx4 lanes' harness-enforced dialect.ts-only delta.
- **HTMX 4 beta deviations explicit, not stable-pass**: 6 classified
  deviations in the artifact (lifecycle event phases, error-swap
  default, attribute inheritance, extensions API, cache-control, and
  the unsupported-topic record), each traced to the pinned profile.
- **Packed artifacts + exact pinned upstream assets**: the scaffold and
  template journeys consume packed tarballs (GH-081 registry); browser
  lanes load the SHA-256-verified local vendor assets only.

## Residual risks and deviations

- The beta lane's DOM-level error-swap divergence is covered by
  dialect-specific scenarios + the classified record (unchanged from
  M3); GA revalidation remains M7.
- Browser matrix is Chrome-for-Testing; other engines arrive with GA
  evidence (M7) — recorded as a known alpha limitation.

## Newly unblocked issues

GH-083 (performance/regression budgets), GH-087 (release notes), and —
with M7 — GH-092.
