# GH-080 verification transcript — getting-started, architecture, security, and HTMX migration guides

## Issue

[GH-080 — Write getting-started, architecture, security, and HTMX
migration
guides](../../issues/m5/gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md)
(branch `gh-080-guides`, worktree `bundar-gh-080`, base commit
`beb50f7` = main after the GH-079 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`;
  Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- htmx 2.0.10 (stable) / 4.0.0-beta6 (experimental — no GA claim).

## What changed

- `docs/getting-started.md` (new): install/first app → routing+typed
  URLs → layouts/fragments with the no-JS MAIN PATH → validated forms →
  security in the main path → test/build/deploy → troubleshooting
  table. Reference apps are the executable sources; every TS block is
  marker-linked to a runnable module.
- `docs/guides/architecture.md` (new): the package/boundary table, the
  request pipeline, server-only JSX (no VDOM/hydration), progressive
  enhancement as architecture, and honest comparison guidance — raw
  Bun.serve, Hono, Elysia, and an explicit "when Bundar is NOT
  appropriate" list.
- `docs/guides/security.md` (new): the GH-069 composition contract
  (three tested rules), sessions, validation+redaction, error opacity +
  metadata-never-trusted authorization, headers/CSP (with the htmx
  indicator-style interaction), uploads, and posture testing commands.
- `docs/guides/htmx-migration.md` (new): the REQUIRED order — audit
  first (`bundar htmx-audit` classifications + auditable suppression),
  clear blockers mechanically, run BOTH lanes from unchanged source
  (enforced dialect.ts-only delta), switch bootstrap-only, and the
  one-file rollback; the known-divergence table from the pinned
  profiles; a GA-changes-nothing-until-M7 statement.
- `docs/snippets/guides/*.ts` (new, 5 runnable modules): the
  getting-started code verbatim above a wiring marker (below it only
  what makes the module executable) — CI runs them.
- `tests/docs/guides.test.ts` (new, 5 tests) +
  `tests/docs/snippets-guide.test.ts` (5) + `test:guides` script:
  1. snippet-marked guide blocks match their runnable modules
     (whitespace/trailing-comma-insensitive, split at the wiring marker);
  2. every marker has a module;
  3. every documented `bun run <script>` exists — validated against
     EVERY documented context's manifest (root + template + examples);
  4. no guide implies htmx 4 is GA (forbidden-phrase scan + every
     4.0.0-beta6 mention carries experimental/beta wording);
  5. the main path is ordered: no-JS fallback and security sections
     PRECEDE the deployment section (index assertions, not prose).

## Real defect found by the guide tests

The script-existence checker initially used `scripts.add(...keys)` —
`Set.add` takes one argument, so the spread silently added one key per
manifest. Caught by the test's own diagnostic (it failed on a script
that demonstrably existed), fixed with a loop. The checker now proves
its collection (68 root + template + example scripts).

## Exact commands and exit statuses

1. `bun run test:guides` — exit 0; 10 tests, 34 expect() calls.
2. `bun run docs:check` — exit 0 (14 manifests). `bun run docs:snippets`
   — exit 0 (7 tests). `bun run api:check` — exit 0.
3. `bun run docs:validate` — exit 0. `bun run docs:links` — exit 0.
4. `bun run typecheck` / `lint` / `format:check` — exit 0.
5. `bun run architecture:check` — exit 0 (89 source files).
6. `bun run build` — exit 0.
7. `bun test` (full) — exit 0; 824 tests across 100 files (15 new:
   10 guide tests + 5 guide-snippet executions), 8,313 expect() calls,
   0 fail, 0 unexplained skips.

## Acceptance evidence

- **All commands/snippets tested in CI**: the 5 TS blocks execute as
  modules; every documented `bun run` command resolves against a real
  manifest script.
- **No guide implies beta is GA**: the forbidden-phrase scan plus the
  per-mention experimental/beta assertion (both in CI).
- **No-JS fallback and security in the main path**: dedicated sections
  in getting-started BEFORE deployment, order-asserted in CI.
- **Migration requires audit and dual-lane tests before changing
  defaults**: the guide's numbered procedure makes lanes-before-switch
  mandatory, with the enforced dialect.ts-only delta and the one-file
  rollback.

## Residual risks and deviations

- The comparison guide is judgment documentation; it names trade-offs
  without benchmark claims (M6 owns performance budgets).
- Guides link the generated API reference and compatibility matrix —
  regeneration is already drift-guarded (GH-079).

## Newly unblocked issues

GH-081 (the M5 developer-experience usability gate).
