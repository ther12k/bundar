# GH-143 verification transcript — wire browser lanes into the required release battery (BR-091)

## Issue

[GH-143 / BR-091 — Wire test:a11y and test:no-js into the required
release battery](https://github.com/ther12k/bundar/issues/143)
(branch `gh-143-lane-gate-wiring`, worktree `bundar-gh-143`,
base `4041890`).

## Starting state (audited gap vs reality)

The re-audit finding was registered against `57d95c2`. By the time this
issue was picked up, part of the fix had already landed with the lane
work itself:

- `scripts/release-gate.ts` ALREADY includes
  `["test:a11y (reference apps)", ["run", "test:a11y"]]` and
  `["test:no-js (reference apps)", ["run", "test:no-js"]]` (lines 29–30),
  and the gate loop `process.exit(exitCode)` on the first nonzero step —
  **ci:release fails if either lane fails** (acceptance criterion 1).
  Fail-closed behavior is not hypothetical: during the BR-088 wave the
  no-JS lane failed a real candidate when next-toggle CSRF tokens came
  back empty and blocked the merge until fixed (commit `e07ef09`
  history).
- Documentation wording (`docs/guides/accessibility.md`) already claimed
  battery enforcement — now accurate rather than aspirational.

What remained genuinely missing and is delivered here:

1. A dedicated CI browser job (Chromium failures visible, not masked by
   `bun test`).
2. Lane artifacts bound to the run.
3. Lane runnability OUTSIDE this workstation (the runner previously
   depended on `$CODEX_HOME/.codex/skills/playwright/...`, which does
   not exist on GitHub runners).

## What changed

- `tests/browser/lanes/cli.ts`: wrapper resolution order
  `BUNDAR_PLAYWRIGHT_CLI` override → Codex skill wrapper → **generated
  portable shim** (`output/playwright/.bin/playwright_cli.sh`) exec'ing
  `npx --yes --package @playwright/cli playwright-cli` with the same
  session-flag contract as the local wrapper. Exported pure
  `resolvePlaywrightCli()` + `SHIM_SOURCE` are unit-tested;
  `tests/browser/lanes/cli.test.ts` pins the contract (override wins,
  shim fallback without a codex install, npx/session passthrough,
  `exec "${cmd[@]}"` tail).
- `.github/workflows/ci.yml`: new required `browser-lanes` job —
  setup-bun 1.4.0, frozen install, Chromium install via the CLI
  (`--with-deps`), `bun run test:a11y`, `bun run test:no-js`, and
  `actions/upload-artifact` of `output/playwright/` with
  `if: always()` so failing lanes still bind their transcripts to the
  run (14-day retention).
- `docs/guides/accessibility.md`: claim updated to state BOTH the
  fail-closed battery wiring AND the dedicated CI job with artifact
  upload — documentation now matches enforcement exactly.

## Commands and exit statuses

On branch `gh-143-lane-gate-wiring` @ base merge `4041890`:

- **Shim-path lane runs (CI-identical)** — forced by pointing
  `CODEX_HOME` at a nonexistent directory so resolution must generate
  and use the portable shim:
  - `CODEX_HOME=/tmp/fake-home/nonexistent bun run test:a11y`
    → "accessibility lane: PASS (7 scans, 0 blocking violations)":
      todo-validation, todo-after-swap, admin-login, admin-list,
      admin-detail at 0 critical/serious each (+2 no-blocking scans).
  - `CODEX_HOME=/tmp/fake-home/nonexistent bun run test:no-js`
    → "no-JS lane: PASS (keyboard-only PRG create/validate/toggle/delete
    + admin login/list)".
  - Generated shim confirmed present at
    `output/playwright/.bin/playwright_cli.sh`.
- `bun test tests/browser/lanes/` → 4 pass / 0 fail.
- `bunx tsc --noEmit -p tsconfig.json` → exit 0.
- `bun run lint` → exit 0; prettier --check → clean.
- YAML validity of ci.yml checked programmatically after edit.

## Acceptance criteria

- [x] `ci:release` fails if either lane fails, on the exact candidate
  SHA — gate battery contains both lanes and exits nonzero on first
  failure (pre-existing loop, demonstrated historically; unchanged).
- [x] Lane artifacts are bound to the run — dedicated CI job uploads
  axe scans + per-step command/stdout/stderr transcripts
  (`if: always()`); locally the same tree lands under
  `output/playwright/<lane>/`.
- [x] Documentation wording matches actual enforcement — guide states
  battery fail-closure + dedicated CI job + uploaded artifacts.

## Residual risks

- `@playwright/cli` fetches its package via npx on first use; runners
  need network egress to npmjs and playwright CDN for browsers
  (standard for browser jobs). Version pinning of the CLI follows the
  upstream package tag; a pinned version can be set later if drift
  becomes a problem.
- The two lane steps run serially in one job (~4–6 min total) rather
  than matrixed; matrix parallelism is possible follow-up, not needed
  at current runtime.

## Notes

Audit-finding context: at audit target `57d95c2` neither the battery
nor docs wiring existed; lanes landed with BR-075/#139 waves. This
issue closes the remaining wiring/runtime gaps; evidence demonstrates
the exact code path CI will execute (generated shim), not just the
workstation path.
