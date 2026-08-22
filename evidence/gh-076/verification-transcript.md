# GH-076 verification transcript — Todo reference application

## Issue

[GH-076 — Build the Todo reference
application](../../issues/m5/gh-076-build-the-todo-reference-application.md)
(branch `gh-076-todo-app`, worktree `bundar-gh-076`, base commit
`511768a` = main after the GH-075 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`;
  Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- Pinned dialects: htmx 2.0.10 (stable) and 4.0.0-beta6 (experimental —
  no GA claim).

## What changed

- `examples/todo/src/domain.ts`: `TodoRepository` (list/get/create/rename/
  toggle/remove/counts) + deterministic in-memory implementation
  (injectable clock, sequential ids, optional seed).
- `examples/todo/src/app.ts`: the application — GH-069 composition
  contract (sessions globally; CSRF scoped to the action group;
  page-issued session-bound synchronizer tokens; 422 keeps the token),
  validated create/edit via `runFormAction` (2–200 char titles), toggle/
  delete with 404 negotiation, filters (all/active/done), counts, flash
  on every mutation, view-negotiated list, app-owned ErrorBoundary.
- `examples/todo/src/layout.tsx`: shared JSX regions — layout with
  aria-live flash, counts region (the OOB target), filter links, todo
  item (inline toggle/delete forms with tokens), create form with the
  field-error slot.
- Enhanced mutations compose PRIMARY item markup + NORMALIZED OOB intents
  via `serializeUpdates` (counts replace-element; row removals as
  explicit remove intents). No hand-written OOB markup anywhere.
- `examples/todo/src/app.test.ts` (11 tests): no-JS flows (list, create
  PRG, flash-once, 422, toggle/delete/edit via PRG, 404), enhanced flows
  (fragment + OOB assertions), CSRF fail-closed, fixture isolation.
- `tools/test-example.ts` + `test:example` script: three real-HTTP lanes
  — `todo:htmx2`, `todo:htmx4` (temp mount, ONLY `src/dialect.ts`
  differs — enforced by recursive diff), `todo:no-js` (zero HTMX
  headers). Live assertions: counts region, create (PRG or fragment+OOB
  per lane), toggle+filter=done, edit, delete+flash+counts arithmetic,
  422/404/403.
- `htmx:source-diff` now guards `examples/todo` too (13 application
  files total across the three guarded trees).
- `docs/examples/todo.md`: the architecture walkthrough with exact
  verification commands.
- `@bundar/testing` fix found by this app's tests: unsafe-method form
  builders now send `origin` by default (browsers always do; CSRF origin
  checks fail closed without it — overridable via init.headers), and
  `enhancedGet`/`enhancedSubmitForm` apply dialect-correct headers even
  with no explicit options. The transport already rewrites origin onto
  the real server, so real-server CSRF flows work unchanged.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0 (after adding the todo
   example deps; lockfile change committed with the app).
2. `bunx tsc --noEmit -p examples/todo/tsconfig.json` — exit 0 (the
   example typechecks standalone, strict mode).
3. `bun test examples/todo` — exit 0; 11 tests, 37 expect() calls.
4. `bun run test:example -- todo:htmx2` — exit 0 (unit 11/11 + all live
   HTTP assertions).
5. `bun run test:example -- todo:htmx4` — exit 0 (variant delta
   confirmed: `src/dialect.ts` only; identical flows pass).
6. `bun run test:example -- todo:no-js` — exit 0 (every mutation via
   PRG; filters/counts/flash through plain navigations).
7. `bun run htmx:source-diff` — exit 0 (13 files, zero dialect
   conditionals, no raw protocol strings).
8. `bun run typecheck` / `lint` / `format:check` — exit 0.
9. `bun run architecture:check` — exit 0 (86 source files);
   `api:check` — exit 0.
10. `bun run build` — exit 0. `bun run docs:validate` / `docs:links` /
    `docs:check` — exit 0.
11. `bun test` (full) — exit 0; 772 tests across 94 files (includes the
    todo's 11), 8,152 expect() calls, 0 fail, 0 unexplained skips.

## Acceptance evidence

- **Same source passes htmx2, htmx4 experimental, and no-JS E2E**: the
  three `test:example` lanes all exit 0 from one source tree; the htmx4
  lane's recursive diff proves only `dialect.ts` differs.
- **Authorization/CSRF posture on every mutation**: all four mutations
  live in the CSRF-scoped action group; tokenless and foreign-origin
  submissions fail closed 403 (unit + live); the fixture is single-user
  with the session middleware attached.
- **OOB/partial count update uses normalized intents**:
  `serializeUpdates` with explicit replace/remove operations; the
  enhanced-create response contains the counts region and the
  enhanced-delete response carries the row-removal intent (asserted per
  lane).
- **No version-specific HTMX condition outside bootstrap**:
  `htmx:source-diff` exit 0 over the todo tree.

## Residual risks and deviations

- Fixture-only persistence (in-memory, single user, `secure: false`
  cookie) — documented in the walkthrough; production posture per the
  sessions guide.
- Real-browser DOM behavior for the OOB swaps is exercised through the
  protocol-level assertions here; the M6 dual-dialect matrix (GH-082)
  adds full browser-lane runs for reference apps.

## Newly unblocked issues

GH-080 (guides reference a complete application) and the M7 GA proof
(GH-093, with the rest of its milestone).
