# GH-087 verification transcript — alpha release notes, compatibility statement, and known limitations

## Issue

[GH-087 — Write alpha release notes, compatibility statement, and known
limitations](../../issues/m6/gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md)
(branch `gh-087-release-notes`, worktree `bundar-gh-087`, base commit
`c13f5b6` = main after the GH-086 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; Chrome for Testing `152.x` lanes;
  htmx 2.0.10 (stable) / 4.0.0-beta6 (experimental — no GA claim);
  Linux `7.0.0-28-generic` x86_64.

## What changed

- `docs/release-notes/alpha.md` (new): the v0.1.0-alpha.1 notes —
  what Bundar is; the implemented-and-evidenced summary (each claim
  linked to its milestone gate or artifact); the compatibility
  statement (Bun >= 1.4.0 required, htmx 2.0.10 stable/default, htmx
  4.0.0-beta6 experimental with 6 classified deviations, no-JS tested
  in every lane, Chrome-for-Testing scope, TS 6.0.3, Bun-only runtime);
  known limitations (pre-1.0 breaking changes, htmx-4 beta-only,
  streaming coverage scope, extension support under the beta,
  fixture-vs-production seams, deployment targets, migration posture);
  upgrade/rollback instructions (alpha dist-tag plan, audit-before-
  upgrade, one-file dialect rollback, checksum verification); the
  changelog pointer to the per-issue log and milestone gates.
- `tools/release/notes-check.ts` (new) + `release:notes-check` /
  `links:artifacts` scripts (one checker, two entry points — documented
  substitution): verifies the notes are claims-checked, not trusted —
  required sections; exact version claims (Bun minimum, both htmx pins
  with experimental wording on the beta); forbidden beta-as-stable/GA
  phrasings; every relative artifact/doc link resolves (12 checked);
  explicit pre-1.0 breaking-change expectations; rollback presence.
- Benchmarks referenced without inflated claims: the notes link the
  environment-bound performance doc and state no rps-leadership.

## Exact commands and exit statuses

1. `bun run release:notes-check` — exit 0 (all claims checks pass, 12
   relative links resolved).
2. `bun run links:artifacts` — exit 0 (checker mode).
3. `bun run docs:check` — exit 0; `docs:validate` (217 documents) /
   `docs:links` (1,165 links) — exit 0.
4. `bun run typecheck` / `lint` / `format:check` — exit 0.
5. `bun test` (full) — exit 0; 827 tests across 101 files, 0 fail.

## Acceptance evidence

- **No beta feature described as stable or GA**: forbidden-phrase scan
  in CI + experimental wording bound to the beta pin.
- **Every compatibility claim links to executed evidence**: gates,
  release-matrix/performance artifacts, and compatibility docs — link
  resolution enforced.
- **Breaking-change expectations explicit**: pre-1.0 statement checked.
- **Upgrade and rollback instructions present**: section + checker.

## Residual risks and deviations

- Notes describe the simulated release plan (0.1.0-alpha.1 @ alpha);
  GH-088's release gate executes the actual publish using them.

## Newly unblocked issues

GH-088 (the v0.1.0-alpha.1 release gate).
