# GH-020 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-020-error-boundary`

## Delivered contract

**`packages/core/src/errors.ts`**: `HttpError` (code/status/message/details/
headers/cause), `HttpErrorCode` union (11 codes with canonical statuses),
`HttpErrorBody` public envelope, `httpErrors.*` convenience constructors,
`isHttpError`, `ClientDisconnectError`, `isAbortLike`.

**`packages/core/src/error-boundary.ts`**: `ErrorBoundary` with:
- `capture(error)`: HttpError → its public envelope (status + custom headers);
  thrown `Response` → preserved as-is; abort/client-disconnect → 499 with
  debug-level logging; everything else → opaque 500 (message only in
  development), logging hook receives classified entries
  (debug/info/warn/error levels).
- `wrap(handler)`: sync try/catch + async `.catch` routing through the
  boundary.
- `renderUnexpected` custom renderer with a **static safe fallback** when the
  renderer itself throws.
- Development vs production via `NODE_ENV` (explicit override supported).

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun test ./packages/core/test/errors
  13 pass, 0 fail (within the 292-test full run)

$ NODE_ENV=production bun test ./packages/core/test/errors/production.test.ts
  4 pass, 0 fail
  -> exit 0

$ bun test
  292 pass, 0 fail, 2706 expect calls across 37 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (41 files) / pack:inspect @bundar/core / build / format:check
  -> exit 0
```

## Acceptance evidence

- Expected 4xx: deterministic JSON envelopes (code+message+details), exact
  statuses (400/401/403/404/405/409/422/413/415/429 asserted), custom
  headers preserved.
- Unexpected errors: 500 with **no message, stack, or path fragments** in
  production (asserted against "secret…/home/….ts:" payloads); development
  includes the message under a `development` key.
- Abort/client-disconnect classified separately: 499 + debug logging
  (asserted distinct from info/error levels).
- Boundary self-safety: a throwing custom renderer still answers with the
  static fallback — original and renderer errors both absent from the body.
- Thrown `Response` failures preserved (contractual pass-through).
- Live end-to-end: wrapped handlers on a real server produce envelopes for
  expected failures and opaque 500s for unexpected ones; async rejections
  route identically.
- No mandatory test failure hidden, skipped, or downgraded.

## Residual risks

- HTML page/fragment error negotiation is GH-065; terminal not-found/method
  behaviors are GH-022.
- 499 is a non-standard status (nginx convention) chosen deliberately for
  client-gone classification; it never reaches a live client.
