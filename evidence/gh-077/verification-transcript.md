# GH-077 verification transcript — Admin CRUD reference application

## Issue

[GH-077 — Build the Admin CRUD reference
application](../../issues/m5/gh-077-build-the-admin-crud-reference-application.md)
(branch `gh-077-admin-crud`, worktree `bundar-gh-077`, base commit
`bae4073` = main after the GH-076 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`;
  Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- Pinned dialects: htmx 2.0.10 (stable) and 4.0.0-beta6 (experimental —
  no GA claim).

## What changed

- `examples/admin-crud/src/domain.ts`: `ArticleRepository` — versioned
  articles (optimistic concurrency via `ArticleConflictError`), an
  append-only audit log, deterministic seeded data (7 fictional
  articles; no real-looking personal data), query with search/status/
  pagination (5 per page).
- `examples/admin-crud/src/app.ts`: fixture login (documented seam for
  real authentication) storing the role in the session; SERVER-SIDE
  `requireRole` gates (viewer read / editor create+edit / admin delete)
  reading ONLY the session; create/edit with validation (422), stale
  version → 409 negotiation, delete admin-only; audit feed refreshed as
  a normalized OOB intent after every mutation (row replace/remove +
  audit-region replace-element via serializeUpdates); 401/403/404/409
  page/fragment error negotiation with no protected content in auth
  failures; the GH-069 session+CSRF composition contract throughout.
- `examples/admin-crud/src/layout.ts`: accessible regions — labeled
  search/filter GET form (works with zero JS), pagination nav, table,
  inline create/edit forms with `role="alert"` error slots, audit
  region, aria-live flash.
- `examples/admin-crud/src/app.test.ts` (9 tests): roles matrix, table/
  search/filter/pagination, create validation + PRG, 409-then-fresh
  edit, audit entries, enhanced multi-region fragments.
- `examples/admin-crud/src/security.test.ts` (7 tests,
  `security:example-admin`): direct-URL ↔ enhanced authorization parity,
  HTMX headers never grant identity (viewer claiming `hx-trigger:
  admin-button` still 403), record identity from route params never
  `hx-target`, unauthenticated reads leak nothing in either mode, CSRF
  fail-closed on all four mutations + foreign-origin rejection, error
  bodies (401/403/404/409/422) carry messages but never internals.
- `tools/test-example.ts`: generalized to per-app scenarios — six lanes:
  todo:htmx2/htmx4/no-js and admin:htmx2/htmx4/no-js (the htmx4 lanes
  enforce the dialect.ts-only delta by recursive diff).
- `htmx:source-diff` now guards `examples/admin-crud` (20 application
  files total across the four guarded trees).
- `docs/examples/admin.md`: architecture walkthrough + where production
  plugs in (durable session store, real authentication, SQL behind the
  repository interface).

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0 (after adding the admin
   example deps; lockfile change committed with the app).
2. `bunx tsc --noEmit -p examples/admin-crud/tsconfig.json` — exit 0
   (standalone, strict).
3. `bun test examples/admin-crud` — exit 0; 16 tests, 80 expect() calls.
4. `bun run security:example-admin` — exit 0; 7 tests, 33 expect() calls.
5. `bun run test:example -- admin:htmx2` / `admin:htmx4` / `admin:no-js`
   — all exit 0 (login PRG, paginated table, search + status filter,
   create PRG-or-fragment+OOB per lane, 409 conflict then fresh edit,
   version increment, viewer 403, audit entries, anonymous 401 with no
   data leakage).
6. `bun run test:example -- todo:htmx2` / `todo:htmx4` / `todo:no-js` —
   all exit 0 (the todo lanes still pass after the runner generalized).
7. `bun run htmx:source-diff` — exit 0 (20 files, zero dialect
   conditionals, no raw protocol strings).
8. `bun run typecheck` / `lint` / `format:check` — exit 0.
9. `bun run architecture:check` — exit 0; `api:check` — exit 0.
10. `bun run build` — exit 0. `docs:validate` / `docs:links` /
    `docs:check` — exit 0.
11. `bun test` (full) — exit 0; 788 tests across 96 files, 8,232
    expect() calls, 0 fail, 0 unexplained skips.

## Acceptance evidence

- **Direct URL access enforces the same authorization as enhanced
  requests**: security suite, parity assertions + per-lane E2E checks.
- **Table/filter/forms usable with JavaScript disabled**: the no-js E2E
  lane drives login, search, filter, pagination, create, edit, and
  conflict handling with zero HTMX headers; controls are a plain GET
  form.
- **HTMX metadata never trusted for authorization or record identity**:
  dedicated security tests (trigger-claim 403; target-header vs
  route-param identity).
- **Both adapters run from unchanged domain/routes/components**: the
  admin:htmx4 lane's recursive diff allows only `src/dialect.ts` to
  differ; every flow assertion passes on both dialects.

## Residual risks and deviations

- Fixture authentication (a user field trusted into the session) and the
  in-memory store are explicitly documented as seams, not production
  posture — the walkthrough names exactly where real auth/store/DB plug
  in.
- Real-browser DOM runs for reference apps land with the M6 matrix
  (GH-082); protocol-level OOB assertions cover this issue.

## Newly unblocked issues

GH-080 (guides) and GH-093 (M7 GA proof, with its milestone).
