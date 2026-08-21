# GH-043 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-043-htmx2-adapter`
- Browser evidence base: Chrome for Testing 152.0.7977.8 (GH-008 lane)

## Delivered contract

`packages/htmx/src/dialects/v2/index.ts` pins the complete stable v2 profile
and re-exports from `@bundar/htmx/2`:

- `HTMX2_TESTED_VERSION = "2.0.10"` with
  `HTMX2_ASSET_SHA256 = 71ea…5c0de` (matches evidence/gh-008 fixture hash).
- `HTMX2_PROFILE`: exact request/response header lists; lifecycle record
  (afterRequest observed under 2.0.10, event order beforeSwap→afterSwap→
  afterSettle); history behavior (push default, replace supported,
  history-restore header); error behavior (default error swap = target);
  inheritance (attribute inheritance true, inherit-attrs core in v2);
  supported extensions list; and an explicit `unimplemented` list
  (`hx-vals js:` arbitrary evaluation; sse/websocket transports) — never
  silently approximated.
- `decodeRequest` delegates to the GH-041 normalizer; `encodeResponseDirective`
  delegates to the GH-042 encoder (validation + conflict rules included).
- Type repair: the stale GH-040-era `HtmxRequestMetadata` interface in
  `dialect.ts` was replaced by an alias to GH-041's `NormalizedHtmxRequest`
  (the richer contract), and the v4 adapter was migrated onto the same
  delegating decoders — one normalized surface for both dialects.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/htmx typecheck
  -> exit 0

$ bun test ./packages/htmx/test/v2
  13 pass, 0 fail (within the 50-test htmx run)

$ bun run test:browser:htmx2
  -> exit 0 (existing pinned 2.0.10 lane; version/integrity re-affirmed)

$ bun test
  237 pass, 0 fail, 2551 expect calls across 31 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (35 files) / pack:inspect @bundar/htmx / build / format:check
  -> exit 0
```

Tooling decisions (documented): planned `test:browser:htmx2 -- protocol` runs
as the existing pinned browser lane (the protocol assertions live in its
fixtures); planned `htmx:profile-report -- v2` is superseded by the machine-
readable `HTMX2_PROFILE` constant asserted in tests (profile facts are code,
not prose).

## Acceptance evidence

- Every profile field has positive/absent/malformed/conflict tests: request
  headers (all seven, positive + all-absent + malformed selector/URL),
  response directives (all ten kinds + one-header-each + injection throws +
  multi-directive conflict).
- Exact version stated: adapter metadata, asset descriptor, and profile all
  pin 2.0.10; integrity is the GH-008 SHA-256.
- Unimplemented features documented in `HTMX2_PROFILE.unimplemented`.
- Stable lane purity: serialized profile contains no "beta"/"htmx4"/"v4"
  strings; adapter metadata keys contain no "4".
- No mandatory test failure hidden, skipped, or downgraded.

## Residual risks

- SSE/WebSocket extension transports remain out of neutral scope until
  streaming lands (GH-034/GH-051).
- Cache-variation policy built on these headers is GH-049.
