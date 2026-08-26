# GH-144 verification transcript — @bundar/testing production parity & session failed-touch (BR-092 / BR-090)

Issue #144 · branch `gh-144-testing-parity` · base main `72de865`.

## What changed

All 6 testing parity gaps identified in the re-audit are resolved, tested, and proven against real `Bun.serve` in a golden conformance matrix:

1. **Route Precedence (exact > parameter > wildcard > catch-all)**:
   - `packages/testing/src/match.ts`: Candidate route patterns are sorted by category precedence before matching (`patternPrecedence()` ranks exact as 0, parameter as 1, subpath wildcard as 2, root catch-all as 3; with static specificity sub-sorting).
   - Solves the registration-order bug where `/users/:id` registered before `/users/me` shadowed the exact route in-process.

2. **HEAD Response Body Stripping**:
   - `packages/testing/src/client.ts`: `stripBody(response)` applied to all HEAD responses across static `Response` entries, dynamic handler functions, and error hook results. HEAD preserves GET status and headers with an empty body (`text() === ""`).

3. **Safe Parameter Percent-Decoding**:
   - `packages/testing/src/match.ts`: Parameter extraction uses `decodeURIComponent` within `try / catch`, replacing malformed sequences with `\uFFFD` (mirroring Bun native router) instead of throwing unhandled `URIError`.

4. **Browser-Aware CookieJar**:
   - `packages/testing/src/cookies.ts`: `CookieJar` parses and enforces `Path`, `Domain`, `Secure`, `Expires`, and `Max-Age` (Max-Age takes precedence per RFC 6265; Max-Age=0 or past Expires evicts immediately).
   - `header(requestUrl)` and `absorb(response, requestUrl)` enforce path/domain/scheme filtering against the request target.

5. **307 / 308 Method-and-Body Preserving Redirect Follow**:
   - `packages/testing/src/client.ts` & `packages/testing/src/server.ts`: `follow(response, maxHops)` distinguishes 301/302/303 (PRG pattern -> GET with dropped body) from 307/308 (method and request payload preserved).

6. **Golden Conformance Matrix**:
   - `packages/testing/test/conformance-matrix.test.ts`: Dual-mode test suite executing all 7 capability areas through BOTH `createTestClient(app)` (in-process) AND `startTestServer(app).client` (real Bun.serve over an ephemeral port), asserting exact behavioral parity.

7. **Session Failed-Touch Residual (BR-090 / #142)**:
   - `packages/security/src/session/middleware.ts`: `touch()` return boolean is respected (`if (touched === true) touchedExpiry = nextExpiry;`). If `touch()` returns `false` (e.g. concurrent session destruction or expiry sweep), no refreshed `Set-Cookie` is sent.
   - Pinned by regression tests in `packages/security/test/session-store-contract/sliding-touch.test.ts`.

## Verification results

- Testing package tests: **64 pass / 0 fail** across 6 files (171 expect calls).
- Session store contract tests: **21 pass / 0 fail** across 3 files.
- Full repository test suite: **1,172 pass / 0 fail** across 148 files (10,585 expect calls).
- `tsc --noEmit -p tsconfig.json`: exit 0.
- `eslint .`: exit 0.
- `prettier --check .`: clean.
- `bun run architecture:check`: ok (104 source + 126 test files).
- `bun run docs:check`, `docs:status-check`, `issues:check`, `build`, `release:plan`: all exit 0.

## Acceptance criteria

- [x] Route selection follows native category precedence (exact > param > wildcard) independent of registration order.
- [x] HEAD responses return status and headers without body.
- [x] Malformed percent-encoded parameters do not throw URIError.
- [x] Cookie jar enforces Path, Domain, Secure, and Max-Age/Expires.
- [x] 307/308 redirects preserve method and body; 301/302/303 switch to GET.
- [x] Golden conformance matrix asserts identical behavior between `createTestClient` and `startTestServer`.
- [x] Failed session `touch()` does not refresh browser cookies.
EOF
cat >> log.md <<'EOF'

## 2026-08-27 — BR-092 (#144) & BR-090 failed-touch: @bundar/testing production parity + golden matrix

- Closed all six `@bundar/testing` parity gaps identified in the external re-audit:
  1. **Route Precedence**: `matchRoute` sorts candidate patterns by category precedence (exact > param > wildcard > catch-all) before matching; `/users/me` registered after `/users/:id` wins correctly on `/users/me`.
  2. **HEAD Response Body**: `stripBody` ensures all HEAD responses (static, dynamic, error hook) carry GET-equivalent status/headers with an empty body.
  3. **Safe Parameter Decoding**: `decodeURIComponent` in `matchRoute` catches malformed sequences and replaces them with `\uFFFD` (mirroring Bun native router) instead of throwing URIError.
  4. **Browser-Aware CookieJar**: `CookieJar` parses and enforces `Path`, `Domain`, `Secure`, and `Max-Age`/`Expires` (Max-Age takes precedence; past expiry evicts immediately).
  5. **307/308 Method Preservation**: `follow()` preserves HTTP method and body on 307/308 redirects, while switching to GET on 301/302/303.
  6. **Golden Conformance Matrix**: `tests/conformance-matrix.test.ts` executes all scenarios through BOTH `createTestClient` (in-process) and `startTestServer` (real Bun.serve), verifying byte-for-byte parity.
- **BR-090 failed-touch fix landed**: `sessionMiddleware` checks `if (touched === true) touchedExpiry = nextExpiry;` — failed `touch()` (concurrent logout/destroy) will never refresh client cookies. Pinned with dedicated regression tests.
- Full suite: **1,172 pass / 0 fail** across 148 files; format, lint, typecheck, architecture, docs, build, release:plan all exit 0.
EOF