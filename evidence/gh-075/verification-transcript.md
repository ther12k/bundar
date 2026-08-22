# GH-075 verification transcript — minimal starter template

## Issue

[GH-075 — Create and verify the minimal starter
template](../../issues/m5/gh-075-create-and-verify-the-minimal-starter-template.md)
(branch `gh-075-starter-template`, worktree `bundar-gh-075`, base commit
`4f3a8a4` = main after the GH-071 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`;
  Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- Pinned dialects: htmx 2.0.10 (default) and 4.0.0-beta6 (experimental —
  no GA claim), served from the framework's local vendor assets.

## What changed

- `templates/minimal/` (new): the canonical minimal starter, checked in
  as a real project (workspace member so `workspace:*` deps resolve
  pre-npm — publication is M6). Source stays SMALL and readable: 6
  source files + tests + README documenting each file's exact purpose.
  - `src/dialect.ts` — the ONE dialect decision (bootstrap-time only;
    the htmx 4 swap is a documented two-line change with the beta notice).
  - `src/app.ts` — named routes (`home`, `health`, `subscribe`,
    `asset-htmx`), view-negotiated home, and the progressive subscribe
    form via `runFormAction` (identical validation both worlds; 422 with
    the field-error region; PRG redirect via a TYPED URL `urls.home()`).
  - `src/layout.tsx` — one document layout; local htmx asset script
    (no CDN).
  - `src/routes.gen.ts` — GENERATED typed URL builders (the CLI's
    `routes generate`; `routes:check` guards drift).
  - `src/main.ts` — production bootstrap with the app-owned
    ErrorBoundary.
  - `src/app.test.ts` — 5 tests via @bundar/testing: health, home
    document, no-JS PRG + 422 error region, enhanced fragment, local
    asset.
- `tools/test-template.ts` (new) + `test:template` script: per-variant
  verification — install → typecheck → test → build → START with live
  HTTP assertions (health, home, asset, PRG 303, enhanced 200 fragment,
  422 error region). The htmx4 variant is a temporary mount whose ONLY
  delta from the checked-in template is `src/dialect.ts` (enforced by a
  recursive diff in the harness); bun.lock restored byte-for-byte.
- `tools/source-diff.ts`: now guards `templates/minimal` alongside the
  dual-dialect fixture (zero dialect conditionals, no raw protocol
  strings in application source; `dist/` bundles excluded — they contain
  the framework's own htmx internals by design).

## Tooling decisions (documented substitutions)

The issue's planned `htmx:source-diff templates/minimal` is realized by
extending the existing source-diff tool to both target directories
(same rule set, same exit contract). `test:template -- minimal-htmx2 |
minimal-htmx4` runs the planned contract verbatim.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0 (after adding templates/* to
   workspaces; lockfile change committed with the template).
2. `bun run routes:check` equivalent: `bun packages/cli/src/bin.ts
   routes check --entry templates/minimal/src/app.ts --out
   templates/minimal/src/routes.gen.ts` — exit 0 ("up to date").
3. `bun run test:template -- minimal-htmx2` — exit 0: typecheck, 5/5
   tests, build (92.84 KB), START + all six live HTTP assertions.
4. `bun run test:template -- minimal-htmx4` — exit 0: variant delta
   confirmed (`src/dialect.ts` only), same battery green (build 92.85
   KB); bun.lock/examples restored.
5. `bun run htmx:source-diff` — exit 0 (7 application files verified).
6. `bun run typecheck` / `lint` / `format:check` — exit 0.
7. `bun run architecture:check` — exit 0 (86 source files).
   `bun run api:check` — exit 0 (core unchanged).
8. `bun run build` — exit 0. `bun run docs:validate` / `docs:links` /
   `docs:check` — exit 0 (14 manifests now include the template).
9. `bun test` (full) — exit 0; 761 tests across 93 files (the template's
   5 run in the suite), 8,115 expect() calls, 0 fail.

## Acceptance evidence

- **Install/typecheck/test/build/start in isolation**: `test:template`
  proves the chain for BOTH variants; the checked-in template runs its
  own scripts in its own directory.
- **Core page and form work without JavaScript**: live no-JS submit →
  303 PRG; the home document renders the plain form; invalid input →
  422 with the visible error region (asserted over real HTTP and in the
  in-process tests).
- **Switching adapter changes only bootstrap/configuration**: the htmx4
  variant's recursive-diff gate allows exactly `src/dialect.ts` to
  differ; every route/component/layout byte is identical and the same
  tests + HTTP assertions pass.
- **No demo credentials, random production-looking data, or CDN**: no
  auth anywhere in the template, no seeded fake data, and the htmx
  asset is served from the framework's pinned local vendor file.

## Residual risks and deviations

- Pre-npm alpha: `workspace:*` dependencies until M6 publication
  tooling (same documented arrangement as GH-071).
- The template is a workspace member of this monorepo (its own scripts,
  own tsconfig); copying it out requires published packages (M6).

## Newly unblocked issues

GH-076 (Todo reference application) and GH-077 (Admin CRUD reference
application).
