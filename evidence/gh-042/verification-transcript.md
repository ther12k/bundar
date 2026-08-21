# GH-042 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-042-response-directives`

## Delivered contract

`packages/htmx/src/directives.ts` exports `normalizeDirectives`,
`encodeDirectives`, `applyDirectives`, `DirectiveConflictError`, and
`DirectiveValidationError` over the neutral `HtmxResponseDirective` union
(location, redirect, refresh, push-url, replace-url, retarget, reselect,
reswap, trigger).

- **Deterministic merge/conflict rules**: at most one navigation directive
  (redirect/location/push-url/replace-url) per response — violations throw
  before any encoding; duplicate non-trigger directives throw; trigger event
  lists merge with first-definition-wins on duplicate names and sorted JSON
  serialization.
- **Deterministic order**: `normalizeDirectives` sorts navigation →
  targeting/swap/refresh → triggers, so input order never changes output.
- **Header-injection validation**: CR/LF/NUL rejected in every value; URLs
  restricted to a URI-safe character set; selectors validated against a
  conservative CSS pattern; event names identifier-like; trigger details must
  be JSON-serializable.
- **Non-mutating application**: `applyDirectives` returns a new Response
  preserving status, body, and all non-HX headers.
- Native Response header access remains untouched — directives only add
  `HX-*` headers; non-HTMX fallback semantics are the response as-was.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/htmx typecheck
  -> exit 0

$ bun test ./packages/htmx
  37 pass, 0 fail, 143 expect calls
  (13 response-directive tests + prior request/dialect suites)
  -> exit 0

$ bun test
  189 pass, 0 fail, 2415 expect calls across 27 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (31 files) / pack:inspect @bundar/htmx / build / format:check / docs:validate / docs:links
  -> exit 0
```

Tooling decision (documented): planned `security:headers` is superseded by the
header-injection test block (CRLF rejection across URL/selector/strategy
values, invalid selector/event-name/URL validation); the planned
`response-directives/**` tree runs within `bun test ./packages/htmx`.

## Acceptance evidence

- Conflicts fail before sending: two navigation directives and duplicate
  non-trigger directives both throw with named kinds in the message.
- Multiple triggers serialize predictably: merged object with sorted keys,
  first-definition-wins on duplicates.
- CRLF/header injection: rejected in redirect URLs, retarget selectors, and
  reswap strategies; invalid selectors, event names, and URLs each produce
  specific diagnostics.
- Neutrality: the same neutral directive array encodes identically through
  the v2 adapter, the v4 adapter, and `encodeDirectives` (pairwise header
  equality asserted).
- Determinism: shuffled input order produces identical header sequences.
- No mandatory test failure hidden, skipped, or downgraded.

## Residual risks

- Page/form response composition (combining directives with bodies and
  status policies) is GH-050; redirect/history helpers are GH-052.
- The selector pattern is conservative by design; exotic-but-legal selectors
  are rejected rather than risked (documented trade-off).
