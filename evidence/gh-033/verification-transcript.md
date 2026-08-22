# GH-033 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-033-render-to-string`

## Delivered contract

**`packages/jsx/src/render-to-string.ts`**:
- `renderToString(tree)` — synchronous contract: sync trees return a plain
  `string` (constructor-checked; no Promise anywhere); trees containing
  async components throw `AsyncComponentError` with guidance toward the
  async API.
- `renderToStringAsync(tree, { signal })` — resolves async components and
  promised children with document-order output; AbortSignal propagates.
- `renderToStringAuto(tree, { signal })` — automatic path selection
  (string for sync trees, Promise for async).

**`packages/jsx/src/response.ts`** (inside @bundar/jsx — **no
@bundar/core import**; consumers can render JSX responses without core):
- `fragment(tree, { status, headers, signal })` — renders the tree as-is;
  `Response` for sync trees, `Promise<Response>` for async.
- `page(tree, …)` — full-document render (`<!doctype html>` + single
  `<html>` root enforced on both sync and async paths; violations reject
  consistently so awaiting handlers see one error shape).
- Content type: `text/html; charset=utf-8` (approved UTF-8 semantics) unless
  the caller's explicit `content-type` header overrides; other user headers
  compose untouched; status is caller-controlled.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/jsx typecheck
  -> exit 0

$ bun test ./packages/jsx/test/render-to-string.test.ts
  6 pass, 0 fail

$ bun test ./packages/jsx/test/response.test.ts
  7 pass, 0 fail

$ bun run architecture:check
  ok (46 source files, 7 package rules enforced) — proves @bundar/jsx
  does not import @bundar/core (consumer-independence criterion)

$ bun run test:consumer:jsx
  -> exit 0

$ bun test
  338 pass, 0 fail, 2836 expect calls across 43 files
  -> exit 0

$ bun run typecheck / lint / pack:inspect @bundar/jsx / build / format:check
  -> exit 0
```

## Acceptance evidence

- Sync trees return synchronously: `typeof === "string"` and
  `constructor === String` asserted.
- Async trees resolve without corruption: slow/fast sibling ordering,
  promised children, and auto-path selection all verified.
- Content-Type: UTF-8 default asserted; explicit override preserved.
- Consumer independence: `page`/`fragment` live in `@bundar/jsx` alone —
  the architecture check (which forbids jsx→core imports) passes.
- No mandatory test failure hidden, skipped, or downgraded. One mid-build
  defect fixed: sync-path `page()` threw instead of rejecting, making sync
  and async error shapes inconsistent — now both reject.

## Residual risks

- Streaming render (`renderToStream`) with backpressure/abort handling is
  GH-034; this change always fully renders before responding.
- Page/fragment negotiation against request headers is GH-048.
