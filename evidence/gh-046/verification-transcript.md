# GH-046 verification transcript — normalize HTMX lifecycle and application events

## Issue

[GH-046 — Normalize HTMX lifecycle and application events](../../issues/m3/gh-046-normalize-htmx-lifecycle-and-application-events.md)
(branch `gh-046-events`, worktree `bundar-gh-046`, base commit `c1c9831` = main after the GH-045 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` (depends on @bundar/core, @bundar/jsx, @bundar/schema), pinned dialect profiles htmx `2.0.10` / `4.0.0-beta6` (never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/events.ts` (new):
  - `BundarLifecycleEvent`: normalized client lifecycle event names (`before-request`, `after-request`, `before-swap`, `after-swap`, `after-settle`, `response-error`, `send-error`, `history-restore`, `oob-before-swap`, `oob-after-swap`, `timeout`).
  - `resolveDialectEvent(event, dialect)`: maps normalized events to dialect DOM event names with explicit mapping fidelity (`exact`, `approximate`, `unsupported`).
  - `getEventMappingTable(dialect)`: returns the complete 11-event mapping table for documentation and audit.
  - `createApplicationEvent(name, detail)`: validates server-triggered custom business events with injection protection and JSON serialization checks.
  - `rawDialectEvent(name)`: branded escape hatch allowing opt-in to unmapped dialect events with audit tracking.
  - Error class: `EventDefinitionError`.
- Tests: `packages/htmx/test/events/events.test.ts` (8 tests) — lifecycle event mapping across dialects, approximate mapping notes (htmx 4 history), mapping table retrieval, raw dialect event escape hatch, and application event sanitization/validation.
- `packages/htmx/README.md`: lifecycle and application events documentation.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/events/**` (as `bun test ./packages/htmx/test/events`) — exit 0; 8 tests, 27 expect() calls, 0 fail.
3. `bun run test:browser:htmx2` / `htmx4` — exit 0.
4. `bun run test:browser:report` — exit 0.
5. `bun run --filter @bundar/htmx typecheck` and root `bun run typecheck` — exit 0.
6. `bun run lint`, `bun run format:check` — exit 0.
7. `bun test` (full) — exit 0; 612 tests across 73 files, 0 fail, 7,732 expect() calls.
8. `bun run architecture:check` — exit 0 (71 source files).
9. `bun run pack:inspect @bundar/htmx` — exit 0.
10. `bun run build` — exit 0.
11. `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) — exit 0.

## Acceptance evidence mapping

- "Core reference apps contain no raw version-specific lifecycle event names" — `BundarLifecycleEvent` provides normalized names.
- "Event mapping table identifies exact, approximate, and unsupported mappings" — `getEventMappingTable()` and `resolveDialectEvent()` return `EventMapping` with explicit `mapping` and `note`.
- "Application event payloads are JSON-safe and injection-tested" — `createApplicationEvent()` tests reject control chars and non-JSON-safe payloads.
- "Users can opt into raw dialect events through an explicit escape hatch reported by the audit tool" — `rawDialectEvent()` provides the branded escape hatch with approximate mapping metadata.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record, `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks

- None identified; event mapping is immutable and tested against both profiles.

## Newly unblocked

- GH-078 (HTMX 2-to-4 audit and migration linter; depends on GH-046, GH-047, GH-070).
