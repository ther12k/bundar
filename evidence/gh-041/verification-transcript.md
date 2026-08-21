# GH-041 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-041-request-metadata`

## Delivered contract

`packages/htmx/src/request.ts` exports `normalizeHtmxRequest`,
`MalformedHtmxHeaderError`, and the neutral types
(`HtmxRequestKind` = standard|boosted|history-restore, `HtmxFieldStatus` =
present|absent|malformed|unsupported, `NormalizedHtmxField`, `NormalizedHtmxRequest`,
`RawHeadersDiagnostic`).

- Every field carries an explicit `trust: "untrusted"` — the only trust level
  that exists. Browser-supplied URLs/selectors/ids are surfaced as data and
  are never promoted to authorization or trusted redirect destinations.
- `currentUrl` parses into a `URL` (malformed → status "malformed", value
  null); `target` validates against a conservative selector pattern.
- `representation` derives page-vs-fragment intent (`isHtmx || boosted` →
  fragment); full negotiation is GH-048.
- Version differences surface only through the caller-supplied
  `headerAliases` map (e.g. v4 `HX-Source` → `sourceElement`); consumers
  never branch on v2/v4 header names.
- Raw headers are reachable only via the `meta.raw()` diagnostic accessor
  (frozen `hx-*` snapshot, marked `__diagnosticOnly`).
- Control characters: Bun's `Headers` API rejects CR/LF/NUL at construction
  (platform guard); the parser retains a defense-in-depth check.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/htmx typecheck
  -> exit 0

$ bun test ./packages/htmx
  24 pass, 0 fail, 110 expect calls (9 request-normalization tests + prior)
  -> exit 0

$ bun test
  176 pass, 0 fail, 2384 expect calls across 26 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (30 files) / pack:inspect @bundar/htmx / build / format:check
  -> exit 0
```

Tooling decision (documented): the planned `security:headers` script is
superseded here by the header-injection tests (platform-rejection assertions
plus the parser's control-character layer) — the planned
`packages/htmx/test/request-normalization/**` tree runs within `bun test
./packages/htmx`.

## Acceptance evidence

- Version neutrality: alias map test proves `HX-Source` maps onto
  `sourceElement`; no consumer branches on header names.
- Unknown/absent degrade safely: non-htmx requests produce a page
  representation with all-absent fields; malformed target/URL produce
  status-differentiated fields rather than errors or garbage values.
- Untrusted: every field asserts `trust: "untrusted"` including an
  attacker-hosted `HX-Current-URL` which parses but is never promoted.
- Case-insensitive + deterministic: mixed-case headers decode identically;
  two decodes of the same request produce equal data (raw accessor compared
  by its marker, not function identity).
- CRLF/NUL cannot enter header values (platform rejection asserted for both).
- No mandatory test failure hidden, skipped, or downgraded.

## Residual risks

- `HtmxFieldStatus "unsupported"` is modeled for dialect use (e.g. v4
  cache-control); no current adapter emits it yet.
- Full page/fragment negotiation semantics are GH-048.
