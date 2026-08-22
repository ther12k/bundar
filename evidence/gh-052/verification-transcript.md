# GH-052 verification transcript — redirect, location, and history helpers

## Issue

[GH-052 — Implement redirect, location, and history helpers](../../issues/m3/gh-052-implement-redirect-location-and-history-helpers.md)
(branch `gh-052-navigation`, worktree `bundar-gh-052`, base commit `8b9343b` = main after the GH-047 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` (depends on @bundar/core, @bundar/jsx, @bundar/schema), pinned dialect profiles htmx `2.0.10` / `4.0.0-beta6` (never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/navigation.ts` (new):
  - `validateRedirectUrl(url, options)`: open-redirect defense denying protocol-relative URLs (`//evil.com`), JavaScript/data URI schemes, CRLF injection, and unlisted external domains by default; allows relative paths and explicitly configured `allowedOrigins`.
  - `composeNavigation(request, url, options)` / `htmxRedirect(request, url, options)`: adaptive navigation returning standards-compliant 303 Location redirects for ordinary requests and `HX-Redirect` headers with 200 OK for enhanced requests.
  - `htmxLocation(request, config, options)`: emits `HX-Location` directives for enhanced client-side swaps, or 303 Location redirect fallback.
  - `htmxRefresh()`: emits `HX-Refresh: true` for full client reloads.
  - Error class: `InvalidRedirectUrlError`.
- Tests: `packages/htmx/test/navigation/navigation.test.ts` (11 tests) — open-redirect rejection matrix, allowed origins, CRLF injection prevention, and navigation helper response structures.
- `tools/security/redirects-audit.ts` (new) + `security:redirects` script: fail-closed security audit verifying open-redirect defenses.
- Browser lanes: `tests/browser/server.ts` exposes `/nav-redirect` route; `tests/browser/run.ts` asserts adaptive navigation in both `htmx2` and `htmx4` lanes.
- `packages/htmx/README.md`: navigation and redirect helpers section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/navigation/**` (as `bun test ./packages/htmx/test/navigation`) — exit 0; 11 tests, 22 expect() calls, 0 fail.
3. `bun run security:redirects` — exit 0 (all hostile redirect patterns rejected).
4. `bun run test:browser:htmx2` / `htmx4` — exit 0; `navigation-adaptive` scenario passed in both lanes (`output/playwright/*/navigation.json`).
5. `bun run test:browser:report` — exit 0.
6. `bun run --filter @bundar/htmx typecheck` and root `bun run typecheck` — exit 0.
7. `bun run lint`, `bun run format:check` — exit 0.
8. `bun test` (full) — exit 0; 635 tests across 76 files, 0 fail, 7,784 expect() calls.
9. `bun run architecture:check` — exit 0 (74 source files).
10. `bun run pack:inspect @bundar/htmx` — exit 0.
11. `bun run build` — exit 0.
12. `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) — exit 0.

### Tooling decisions

- The planned `bun run test:browser:dual -- navigation` runner does not exist; the scenario runs in BOTH existing lanes (`htmx2` and `htmx4`) with hard assertions in each (established dual-lane substitution).
- `security:redirects` added verbatim as the planned audit script.

## Acceptance evidence mapping

- "External redirects are denied by default or require explicit allow-listing" — `validateRedirectUrl()` rejects unlisted external domains and protocol-relative URLs.
- "Normal fallback uses standards-compliant redirect responses" — `composeNavigation()` emits 303 Location (or configured 301/302/307/308).
- "Enhanced navigation preserves the requested history semantics" — `htmxRedirect` / `htmxLocation` emit appropriate `HX-Redirect` / `HX-Location` headers.
- "Header conflicts and malformed URLs fail closed" — `InvalidRedirectUrlError` thrown for malformed or injected URLs.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record, `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks

- None identified; URL validation fails closed by default.

## Newly unblocked

- GH-055 (unchanged-source dual-dialect reference fixture; depends on GH-051, GH-052, GH-053, GH-054).
