# GH-078 verification transcript — HTMX 2-to-4 audit and migration linter

## Issue

[GH-078 — Implement the HTMX 2-to-4 audit and migration
linter](../../issues/m5/gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md)
(branch `gh-078-migration-linter`, worktree `bundar-gh-078`, base commit
`6bd7a20` = main after the GH-077 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`;
  Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- Rule data pinned to the shipped dialect profiles: htmx 2.0.10 and
  4.0.0-beta6 (experimental — no GA claim).

## What changed

- `packages/cli/src/audit/rules.ts` (new): the rule set DERIVED from the
  pinned dialect profiles exported by @bundar/htmx — header renames read
  from the v4 adapter's `requestHeaderAliases` metadata; approximate
  event mappings from `getEventMappingTable(htmx4Experimental)`; the
  inheritance rule from `HTMX2_INHERITED_ATTRIBUTES`; extension rules
  from `OFFICIAL_EXTENSIONS` dialectSupport (json-enc = blocking/
  unsupported; sse/ws = review/emulated); plus error-swap-assumption,
  history-assumption, cdn-script, asset-pin, and raw-adapter-escape.
  Raw protocol strings appear nowhere in this package (the frozen
  raw-htmx-surface rule enforced it twice during development — both
  violations were refactored to derived data).
- `packages/cli/src/audit/scan.ts` (new): line-scanner over TS/TSX/HTML/
  JSON (node_modules/dist excluded). Suppression is explicit and
  auditable: `// bundar-audit-ignore: <rule-or-family>` on the line or
  the line above; suppressed findings are still REPORTED with the
  suppression's own location; family prefixes (e.g. `header-rename`)
  cover parameterized rules.
- `packages/cli/src/commands/htmx-audit.ts` (new) + `htmx:audit` script:
  `bundar htmx-audit <paths> [--format=human|json]
  [--fail-on=blocking|review|informational]`. Human report: severity,
  file:line, snippet, what changed, guidance. JSON: machine-readable
  report incl. suppressed entries. Exit codes: 0 below threshold, 1 at/
  above, 2 usage — CI migration gates. The tool NEVER rewrites source
  (v0.1 contract).
- `fixtures/migration/v2-sensitive/` (new): app.ts with every sensitive
  pattern (header rename, approximate event, implicit inheritance,
  hx-ext json-enc + sse, error-swap assumption, hx-push-url, CDN script,
  local pin, raw adapter check), suppressed.ts (auditable suppression),
  clean.ts (neutral API usage — zero findings).
- `packages/cli/test/htmx-audit/audit.test.ts` (new, 19 tests): profile
  derivation, per-pattern detection with severity + evidence, neutral
  code clean, suppression exactness (different rule doesn't silence) and
  audit trail, option validation, exit-code gates (blocking/review/
  suppressed), human output, and end-to-end runs (todo → 0, fixture → 1,
  usage → 2).
- `@bundar/htmx` index: `HTMX2_INHERITED_ATTRIBUTES` was already public;
  duplicate-export slip fixed. `@bundar/cli` now depends on
  `@bundar/htmx` (boundary-allowed).

## Tooling decision

The planned verification paths are realized verbatim:
`bun run htmx:audit fixtures/migration/v2-sensitive` and
`bun run htmx:audit -- --format=json examples/todo`; tests live at
`packages/cli/test/htmx-audit/` (`bun test packages/cli/test/htmx-audit`).

## Exact commands and exit statuses

1. `bun test packages/cli/test/htmx-audit` — exit 0; 19 tests.
2. `bun run htmx:audit -- fixtures/migration/v2-sensitive` — exit 1
   (2 blocking: header rename + json-enc; reviews incl. approximate
   event, inheritance, error-swap, history, cdn; 1 informational pin;
   1 audited suppression).
3. `bun run htmx:audit -- --format=json examples/todo` — exit 0; 8 files
   scanned; 0 blocking; 6 review findings (implicit-inheritance,
   error-swap-assumption) — honest pre-switch advisories, gate-green at
   the default blocking threshold.
4. `bun run htmx:audit -- examples/admin-crud` — exit 0 (0 blocking).
5. `bun run typecheck` / `lint` / `format:check` — exit 0.
6. `bun run architecture:check` — exit 0 (89 source files; the frozen
   raw-htmx-surface rule passes with fully derived rule data).
   `bun test tests/architecture` — exit 0.
7. `bun run pack:inspect @bundar/cli` — exit 0. `api:check` — exit 0.
8. `bun run build` — exit 0. `docs:validate`/`docs:links`/`docs:check` —
   exit 0.
9. `bun test` (full) — exit 0; 807 tests across 97 files, 8,272
   expect() calls, 0 fail, 0 unexplained skips.

## Acceptance evidence

- **Fixtures cover every listed case**: header rename, event rename
  (approximate mapping), implicit inheritance, hx-ext (json-enc +
  sse), history assumptions, error-response swap assumptions, asset
  pins, raw adapter checks — each with a dedicated fixture line and a
  severity assertion.
- **No automatic rewriting**: the tool only reads and reports (v0.1).
- **Suppression explicit and auditable**: ignore comments match exact
  ids or families; suppressed findings stay in the report with the
  suppression location; a wrong-rule ignore does not silence.
- **Exit codes gate CI**: 0/1/2 semantics asserted; `--fail-on` tunes
  the threshold.

## Residual risks and deviations

- The error-swap heuristic (`status: 4xx/5xx` literals) is deliberately
  conservative (review severity, suppressible) — documented in the rule.
- Semantic migration of arbitrary custom JavaScript is out of scope per
  the issue.

## Newly unblocked issues

GH-080 (guides can now document `bundar htmx-audit` as the migration
front door).
