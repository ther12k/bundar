# articles slice — agent map

Purpose: authenticated article CRUD with roles (viewer/editor/admin), optimistic concurrency (409), audit feed as OOB region.
Public entrypoint: articles.routes.ts (`registerArticleRoutes`). Contracts: route names `login*`, `article-*`; DOM ids `article-table`, `article-<id>`, `audit-region`, `form-region`.

Allowed imports: routes → authz/schema/types/view + security helpers; view → types only; authz reads session only — never HTMX metadata.
Read zones: this directory + ../../layout.tsx. Write zones: this directory.

Checks:
- bun test (from examples/admin-crud)
- bun run app:arch .

Escalate when: role model changes, conflict semantics (ArticleConflictError) change, or audit retention policy is touched.

Details: ../../../engineering/application-structure.md
