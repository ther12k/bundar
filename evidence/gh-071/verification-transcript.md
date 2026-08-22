# GH-071 verification transcript — create-bundar scaffolding

## Issue

[GH-071 — Implement create-bundar
scaffolding](../../issues/m5/gh-071-implement-create-bundar-scaffolding.md)
(branch `gh-071-create-bundar`, worktree `bundar-gh-071`, base commit
`b268f2c` = main after the GH-072 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`;
  Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- Generated apps pin htmx 2.0.10 (stable) or 4.0.0-beta6 (experimental —
  no GA claim) via the framework's pinned dialect adapters.

## What changed

- `create-bundar/templates/minimal.ts` (new): the minimal template as
  CODE — package.json (pinned Bun engine `>=1.4.0`, workspace deps, no
  React anywhere), tsconfig (TSX with jsxImportSource @bundar/jsx),
  `src/dialect.ts` (the ONE dialect decision; v4 carries an EXPERIMENTAL
  banner with the exact pin), `src/layout.tsx` (document layout + local
  htmx asset script), `src/app.ts` (health route, home page, progressive
  subscribe form: same handlers serve no-JS PRG and htmx fragments,
  422 for invalid input), `src/main.ts` (production bootstrap with the
  app-owned ErrorBoundary), `src/app.test.ts` (4 generated tests using
  @bundar/testing in both browser modes), README, .gitignore.
- `create-bundar/src/index.ts` (new): `createProject` with fail-closed
  safety — target must be empty or nonexistent (never overwrites user
  files), npm-safe name validation, per-file single-writer guard,
  dialect validation, and the `HTMX4_EXPERIMENTAL_NOTICE` text.
- `create-bundar/src/cli.ts` + `bin.ts` (new): interactive flow when a
  TTY with no arguments (prompt-driven), non-interactive flags
  (`--dialect`, `--name`) for scripts/CI; unknown dialects and usage
  errors exit 1 with actionable messages; experimental selection prints
  the prominent no-GA-claim notice.
- `tools/test-scaffold.ts` (new) + `test:scaffold` script: end-to-end
  verification per dialect — generate → install → typecheck → test →
  build → RUN the production entry → assert over real HTTP: /healthz,
  home document with the form, the local htmx asset (no CDN), the no-JS
  PRG submit (303 → /?subscribed=1), the enhanced fragment submit (200,
  fragment body, no <html>), and the 422 invalid-input path. Cleans up
  and restores bun.lock byte-for-byte (failure paths included).
- `create-bundar/test/create/` (new, 13 tests): generator (file set,
  dialect imports/banners, no-overwrite, name/dialect validation,
  metadata) and CLI (usage, defaults, experimental notice + list,
  interactive prompt flow).
- Manifest updates: create-bundar `bin`, `exports`, `files`
  (src/templates/README), scripts; root tsconfig `create-bundar` path;
  README rewritten.

## Tooling decisions (documented substitutions)

1. @bundar packages are not yet on npm (publication is M6, GH-086).
   Generated projects declare `workspace:*` dependencies, so
   `test:scaffold` verifies them mounted temporarily inside this
   monorepo's `examples/*` workspace glob, with bun.lock snapshotted and
   restored byte-for-byte afterward (both success and failure paths —
   verified: `git status` clean after each run).
2. The issue's planned test location `packages/cli/test/create/**` is
   blocked by the FROZEN architecture rule `relative-escape` (the
   boundary harness caught the first draft: packages/cli tests may not
   relatively import create-bundar). Tests live at
   `create-bundar/test/create/` — same coverage, boundary-compliant;
   run via `bun test create-bundar`.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test create-bundar` — exit 0; 13 tests, 35 expect() calls.
3. `bun run test:scaffold -- htmx2` — exit 0. Generated 9 files;
   install/typecheck/test (4/4)/build (80.70 KB bundle) all exit 0; live
   server checks: healthz ok, home document with `subscribe-form`, local
   htmx asset 200, no-JS submit → 303 `/ ?subscribed=1`, enhanced submit
   → 200 fragment `Subscribed: htmx@example.com`, invalid → 422.
   Cleanup left bun.lock and examples/ untouched.
4. `bun run test:scaffold -- htmx4-experimental` — exit 0; same battery
   with the experimental dialect (startup line reports `dialect:
   htmx4`; generated files carry EXPERIMENTAL banners; notice printed at
   creation).
5. `bun run typecheck` — exit 0. `bun run lint` — exit 0.
   `bun run format:check` — exit 0.
6. `bun run architecture:check` — exit 0 (86 source files; the harness
   passes with the tests relocated per the frozen rules).
7. `bun run pack:inspect create-bundar` — exit 0.
8. `bun run api:check` — exit 0 (core unchanged).
9. `bun run build` — exit 0. `bun run docs:validate` / `docs:links` /
   `docs:check` — exit 0.
10. `bun test` (full) — exit 0; 756 tests across 92 files, 8,103
    expect() calls, 0 fail, 0 unexplained skips.

## Acceptance evidence

- **Installs, typechecks, tests, builds, and runs in a clean temporary
  directory**: `test:scaffold` proves the full chain for BOTH dialects
  in a freshly generated directory (empty before generation).
- **Default project works with JavaScript disabled**: the no-JS
  subscribe submit receives 303 Post/Redirect/Get; the home document
  renders the plain form (method=post/action) with no scripting needed.
- **No React/hydration runtime**: generated package metadata contains
  zero react-* dependencies (unit-asserted) and no generated source
  file contains the string "react" (unit-asserted per file).
- **Experimental option emits a prominent notice and exact pin**: the
  CLI prints the EXPERIMENTAL DIALECT SELECTED block with the
  no-GA-claim text; generated files carry the banner naming
  4.0.0-beta6.

## Residual risks and deviations

- Pre-npm alpha: generated projects target monorepo workspace
  resolution (`workspace:*`); registry-pinned versions arrive with the
  M6 release tooling (GH-084/GH-086) — documented in the generated
  README and here.
- Interactive prompts are exercised through an injected prompt (CI has
  no TTY); the real TTY path uses Bun.stdin.

## Newly unblocked issues

GH-075 (minimal starter template) — its dependency set
(GH-071, GH-072, GH-074) is now complete.
