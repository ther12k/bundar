# Admin CRUD reference application — architecture walkthrough

The admin app (`examples/admin-crud`) is the business-application
reference: authenticated sessions with server-side roles, a searchable/
filterable/paginated table, inline create/edit forms with optimistic-
concurrency conflicts, role-gated deletes, an audit feed, and multi-region
out-of-band updates — one handler set for no-JS and enhanced browsers.

## The moving parts

```
examples/admin-crud/src/
  domain.ts       ArticleRepository: versioned records + append-only audit log
  app.ts          roles, routes, form validation, conflicts, OOB intents
  layout.ts       table, controls, inline forms, audit region (accessible)
  dialect.ts      the ONE dialect decision (bootstrap-time only)
  main.ts         production bootstrap (app-owned ErrorBoundary)
  app.test.ts     flows: login/roles, table, conflicts, audit, OOB
  security.test.ts  the security posture suite (security:example-admin)
```

- **Roles are server-side only.** `requireRole(context, minimum)` reads
  the session — viewer (read) / editor (create+edit) / admin (+delete).
  Direct URLs and enhanced requests enforce identical rules; HTMX
  headers are never consulted for permission or record identity (the
  security suite proves a viewer claiming `hx-trigger: admin-button`
  still gets 403, and a delete's identity comes from the route param,
  never `hx-target`).
- **Conflicts are explicit.** Records carry a `version`; edits submit
  the version they saw. A stale version throws `ArticleConflictError`
  and negotiates a 409 ("Someone else changed this article — reload and
  retry"); the domain bumps versions on every write.
- **Multi-region updates are normalized intents.** Enhanced edits return
  the updated row plus a refreshed audit feed via `serializeUpdates`
  (replace-element); deletes emit an explicit remove intent for the row
  and refresh the audit feed. No hand-written OOB markup.
- **Accessible + no-JS.** Table controls are a plain GET form (search
  works without JavaScript); forms have labels and `role="alert"` error
  slots; flash is `aria-live="polite"`.

## Where production plugs in

The fixture is deliberately explicit about its seams:

- **Session store** — `createMemorySessionStore()` is test-only; swap a
  durable `SessionStore` (see the sessions guide).
- **Authentication** — `/login` trusts a fixture user field and stores
  the role in the session; a real app verifies credentials there and
  keeps `requireRole` exactly as is.
- **Database** — implement `ArticleRepository` over SQL; the audit log
  becomes an append-only table; handlers never change.

## Verify

```bash
bun test examples/admin-crud                  # flows + security suites
bun run security:example-admin                # the posture suite alone
bun run test:example -- admin:htmx2           # real HTTP, stable lane
bun run test:example -- admin:htmx4           # experimental lane
bun run test:example -- admin:no-js           # zero HTMX headers
```
