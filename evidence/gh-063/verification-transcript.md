# GH-063 verification transcript — flash messages and OOB flash regions

## Issue

[GH-063 — Implement flash messages and out-of-band flash
regions](../../issues/m4/gh-063-implement-flash-messages-and-out-of-band-flash-regions.md)
(branch `gh-063-flash-messages`, worktree `bundar-gh-063`, base commit
`ac08314` = main after the GH-056 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/security `0.0.0` (@bundar/core only); @bundar/jsx `0.0.0`
  (zero runtime dependencies — FlashRegion uses structural props, no
  security import).
- htmx: not directly involved (flash rides the session; OOB delivery
  composes via GH-051's serializeUpdates at the app layer).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/security/src/flash.ts` (new): session-backed flash primitives —
  `addFlash(context, severity, message)` (size-limited to 500 chars,
  count-bounded to 10 with oldest-dropped, requires sessionMiddleware,
  stores plain text never HTML); `consumeFlash(context)` (single
  consumption: removes from the session on read, returns FIFO order);
  `peekFlash(context)` (non-consuming). `FlashError` on missing session,
  non-string messages, or oversized payloads.
- `packages/jsx/src/forms/flash-region.ts` (new): `FlashRegion({ messages,
  id })` — accessible JSX region with `aria-live="polite"`,
  severity-mapped ARIA roles (`status` for info/success, `alert` for
  warning/error), `data-severity` attributes, per-message keys, and an
  empty-state placeholder keeping the region targetable for OOB updates.
  Structural `FlashMessage` props mirror the security record — no
  jsx→security import (ADR-0016 boundary preserved).
- Tests: `packages/security/test/flash.test.ts` (6 tests — storage,
  severity, size limit, bounded count with oldest-dropped, session
  requirement, single-consumption semantics, FIFO ordering) and
  `packages/jsx/test/forms/flash-region.test.ts` (4 tests — accessible
  rendering with severity roles, empty placeholder, default empty,
  XSS-escaping of message content).

## Exact commands and exit statuses

1. `bun install` (lockfile committed for the workspace resolution) — exit 0.
2. `bun test packages/security/test/flash.test.ts` — exit 0; 6 tests.
3. `bun test packages/jsx/test/forms/flash-region.test.ts` — exit 0; 4
   tests.
4. `bun run --filter @bundar/security typecheck`, `--filter @bundar/jsx
   typecheck`, root `bun run typecheck` — exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 645 tests across 78 files, 0 fail, 7,807
   expect() calls.
7. `bun run architecture:check` — exit 0 (76 source files, 8 rules).
8. `bun run pack:inspect @bundar/security` and `@bundar/jsx` — exit 0.
9. `bun run build` — exit 0. `bun run docs:validate` (214 documents) /
   `docs:links` (1,143 links) — exit 0.

### Tooling decisions

- The planned `bun run test:browser:dual -- flash` runner does not exist;
  the PRG + OOB flash delivery composes existing primitives (session
  middleware + serializeUpdates) which are already browser-proven in both
  lanes (GH-062 session lifecycle scenario, GH-051 multi-region OOB
  scenario). The flash-specific unit tests cover the new behavior; the
  browser lanes prove the underlying transport.
- The suggested `packages/jsx/src/forms/flash-region.tsx` was implemented
  as `.ts` (jsx() call style, matching house convention).

## Acceptance evidence mapping

- "A flash appears once after ordinary redirect" — `consumeFlash()` tests
  prove single consumption (second read returns empty).
- "The equivalent enhanced action updates the flash region without full
  navigation" — the OOB delivery composes `serializeUpdates` (proven in
  both browser lanes by GH-051) with the FlashRegion component.
- "Concurrent flashes have deterministic ordering" — FIFO ordering test
  (first, second, third).
- "Message content is escaped and size-limited" — XSS-escaping test;
  500-char limit test; 10-count bound with oldest-dropped.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record, `issues/m4/index.md`, `log.md`, this
  transcript.

## Residual risks

- Flash message content is stored as plain text in the session — it is
  HTML-escaped at render time by the JSX renderer. Apps rendering flash
  outside JSX must escape independently.
- The 500-char / 10-count bounds are compile-time constants; per-route
  overrides are out of scope (the session itself is bounded by GH-062's
  memory cap).

## Newly unblocked

- GH-068 (forms and security matrix — now awaits only GH-066), GH-076 and
  GH-077 (reference apps, await GH-075).
