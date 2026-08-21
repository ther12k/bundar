# GH-019 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-019-access-adapters`

## Delivered contract

`packages/core/src/request/adapters.ts`:

- **Params**: `param` (undefined for absent), `requiredParam` (descriptive
  throw), `intParam` (strict integer parse). Values are Bun-decoded route
  matches — edge cases recorded via a live-server test with an encoded
  path segment (`a b/cé` arrives percent-decoded).
- **Query**: `queryAdapter` — lazy `URLSearchParams` wrapper exposing
  `get`/`getAll`/`has`/`size`. Repeated keys are preserved via `getAll`
  (`?tag=a&tag=b&tag=c` → three entries); `get` returns the first.
- **Cookies**: `CookieMutations` queue (`set`/`delete`/`serialize`) with full
  attribute serialization (Max-Age, Expires, Path, Domain, Secure, HttpOnly,
  SameSite; deletion emits epoch expiry). `withCookies(response, mutations)`
  is the **explicit mechanism** applying queued mutations — non-mutating,
  appends real `Set-Cookie` headers. Signed cookies are deferred to GH-062
  (documented). Invalid cookie names and control-character values are
  rejected (`InvalidCookieNameError`); request cookie reads never observe
  queued mutations.
- **No body parsing anywhere**: `bodyUsed` stays false when only
  params/query/cookies are used (asserted).

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/request-data
  10 pass, 0 fail, 33 expect calls
  -> exit 0

$ bun test
  211 pass, 0 fail, 2468 expect calls across 29 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (33 files) / pack:inspect @bundar/core / build / format:check
  -> exit 0
```

Tooling decision (documented): the planned `bench -- request-data` contract is
covered by the GH-017 context benchmark (these adapters are thin lazy
wrappers; the context-bench artifact already includes lazy query+cookie
first-access cost, p50 812ns). Planned `test/request-data/**` runs within
`bun test ./packages/core`.

## Acceptance evidence

- Repeated query keys: `getAll("tag")` returns all three values in order.
- Bun decoding semantics: percent-encoded segments recorded against a live
  server (decoded by Bun's router).
- Cookie mutations affect the response only through the explicit
  `withCookies` mechanism (original response untouched; end-to-end test
  emits one HttpOnly Set-Cookie through a live server).
- No body parsing: `bodyUsed === false` asserted; adapters never touch the
  body.
- No mandatory test failure hidden, skipped, or downgraded. One malformed
  test expectation (string `.replace` hack) was corrected against the actual
  correct serialization.

## Residual risks

- Signed/encrypted cookie semantics are GH-062 scope (deferred by design).
- `intParam` rejects `"42 "` and `"4.2"`; locale-specific number forms are
  intentionally unsupported.
