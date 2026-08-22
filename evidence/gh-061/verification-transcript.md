# GH-061 verification transcript — CSRF primitives and form middleware

## Issue

[GH-061 — Implement CSRF primitives and form
middleware](../../issues/m4/gh-061-implement-csrf-primitives-and-form-middleware.md)
(branch `gh-061-csrf`, worktree `bundar-gh-061`, base commit `1a7b1fd` = main
after the GH-059 merge).

## Environment (exact versions)

- Bun `1.4.0` (WebCrypto HMAC-SHA-256 + `crypto.getRandomValues`); TypeScript
  `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- New package `@bundar/security` `0.0.0` (workspace dependency
  `@bundar/core` only — permitted by **ADR-0017**, which supersedes
  ADR-0016's package map by adding exactly this package; see
  `decisions/0017-security-package.md`).
- @bundar/jsx `0.0.0` (hidden-input helper, structural — no security import).
- Browser lanes: htmx `2.0.10` (stable) and `4.0.0-beta6` (experimental;
  never claimed GA); Chrome for Testing `152.0.7977.8` / Playwright Chromium
  `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `decisions/0017-security-package.md` (new): ADR adding `@bundar/security`
  (imports `@bundar/core` only); `boundaries.json` rule (8 package rules now
  enforced), `decisions/index.md`, skeleton test entry
  (`allowsRuntimeDependencies: true`).
- `packages/security/src/csrf.ts` (new): synchronizer-token CSRF —
  `createCsrfSecret` (32 random bytes), `issueCsrfToken`/`verifyCsrfToken`
  (`expiryMs.nonce.mac` with `mac = HMAC-SHA-256(secret, binding|expiry|
  nonce)`, constant-time MAC comparison, binding = session cookie value so
  cross-session tokens fail), `constantTimeEqual` (no early exit),
  `verifyOrigin` (documented fail-closed chain: `Sec-Fetch-Site` must be
  `same-origin` → else `Origin` must match own/allowed origin → else reject:
  browsers always send `Origin` on unsafe form posts), `csrfMiddleware`
  (safe methods issue-only, never rotate or consume; unsafe methods verify
  origin AND submitted token — header first (`x-csrf-token`, HTMX) then
  hidden field read from a **request clone** so the handler's `parseForm`
  still sees the original body — then rotate; optional single-use replay
  prohibition via pluggable `TokenStore`, in-memory default), `CsrfError`
  (public generic 403 envelope; the verification reason stays server-side).
- `packages/jsx/src/forms/csrf-input.ts` (new): `CsrfInput({ token })` hidden
  field (`_csrf`), attribute-escaped.
- Tests: `packages/security/test/csrf/csrf.test.ts` (13) +
  `middleware.test.ts` (9) + `packages/jsx/test/forms/csrf-input.test.ts` (3).
- `tools/security/csrf-audit.ts` (new) + root script `security:csrf`:
  fail-closed matrix runner (all failure modes reject; origin policy;
  safe-method non-rotation; token material absent from serialized envelopes;
  replay prohibition when configured).
- Browser fixture: `/csrf-form` (issues token cookie + hidden field),
  `/csrf-form-bad` (token-less form), `/csrf-protected` through the
  middleware; the fixture server now routes thrown errors through an
  `ErrorBoundary` so `CsrfError` keeps its 403 envelope. Both lanes assert:
  no-JS form flow succeeds (`csrf-ok:Bundar`), header flow succeeds
  (`csrf-ok:ViaHeader`), token-less POST rejected with 403, and the bad-form
  browser submission renders the generic rejection.
- Root `tsconfig.json`: `@bundar/security` path.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/security/test/csrf/**` (as
   `bun test ./packages/security`) — exit 0; 22 tests, 0 fail.
3. `bun test packages/jsx/test/forms` — exit 0 (9 tests incl. 3 new).
4. `bun run security:csrf` — exit 0 ("all failure modes reject; origin
   policy fail-closed; safe methods never rotate; tokens absent from
   envelopes; replay prohibited when configured").
5. `bun run test:browser:htmx2` — exit 0; `bun run test:browser:htmx4` —
   exit 0 (new `csrf-form-flow`, `csrf-header-flow`, `csrf-rejection`
   scenarios hard-asserted in BOTH lanes; artifacts `csrf-result.txt`,
   `csrf-header.json`, `csrf-bad-result.txt` per lane).
6. `bun run typecheck`, `--filter @bundar/security typecheck`,
   `--filter @bundar/jsx typecheck` — exit 0.
7. `bun run lint`, `bun run format:check` — exit 0.
8. `bun test` (full) — exit 0; 459 tests across 57 files, 0 fail, 3,192
   expect() calls.
9. `bun run architecture:check` — exit 0 (56 source files, 8 package rules).
10. `bun run pack:inspect @bundar/security` — exit 0 (files allow-list, one
    workspace dependency).
11. `bun run build` — exit 0. `bun run docs:validate` (211 documents — the
    ADR is in the corpus) and `bun run docs:links` (1,090 links) — exit 0.

### Tooling decisions

- The planned `bun run test:browser:dual -- csrf` runner does not exist; the
  CSRF scenarios were added to BOTH existing lanes (htmx 2.0.10 and
  4.0.0-beta6) with hard assertions in each — dual-dialect coverage without
  waiting for GH-055's fixture.
- The suggested `.tsx` filenames are implemented as `.ts` (both packages use
  `jsx()` calls, matching house style).

## Acceptance evidence mapping

- "Missing, malformed, expired, replayed where prohibited, and cross-origin
  tokens fail closed" — primitive tests for each reason; middleware matrix
  (missing field, tampered MAC, foreign-session token, cross-origin Origin,
  double-submit without field, single-use replay); audit script re-proves
  the matrix end to end.
- "Safe methods do not rotate or consume tokens unexpectedly" — GET with an
  existing token sets no cookie; first-visit GET issues exactly one; the
  single-use store is untouched by safe methods.
- "HTMX and no-JS form flows use the same protection" — header and hidden
  field submit through the same verifier (unit + real-browser lanes: form
  navigation POST and fetch with `x-csrf-token`).
- "Tokens are not logged or exposed in error messages" — `CsrfError`'s
  public envelope is the generic "request verification failed"; the reason
  lives on a server-side property only; tests assert token material is
  absent from `message` and `toBody()`.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — ADR-0017 + decisions index, closure record below,
  `issues/m4/index.md`, `log.md`, README of the new package.

## Residual risks and deviations

- The default token store is in-memory single-process; multi-process
  deployments must supply a shared `TokenStore` (interface is pluggable) or
  stay stateless (replay permitted until expiry — the documented default).
- The middleware binds to the raw session-cookie value; rotating session IDs
  invalidates outstanding CSRF tokens (fail closed, by design).
- `Sec-Fetch-Site`/`Origin` absent (non-browser clients) is rejected by
  policy; API-only endpoints should not mount this middleware.
- Token reads clone the request body (bounded by `maxTokenBodyBytes`,
  default 1 MiB) — a second buffered copy of form bodies within that cap;
  documented cost of single-consumption preservation.

## Newly unblocked

- GH-064 (multipart upload policy) and GH-068 (forms/security matrix).
