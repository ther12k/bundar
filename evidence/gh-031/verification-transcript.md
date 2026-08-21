# GH-031 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-031-raw-html-boundary` (rebased onto post-GH-029 main)

## Delivered contract

`packages/jsx/src/raw.ts` exports `raw()`, `isRawHtml()`, and `RawHtml`:

- The brand is a module-registered **symbol property** defined
  non-enumerable/non-writable/non-configurable on a frozen object.
- **Deliberate construction required**: only `raw(...)` produces the brand.
  Object-shape impostors (`{html}`), spreads of genuine values (symbol is
  non-enumerable), and JSON round-trips all fail `isRawHtml` and throw
  `UnsupportedChildError` at render time.
- **Ordinary strings always escape**, including when typed broadly.
- `renderPrimitive` treats branded values as the only renderable object form;
  child-position raw renders verbatim inside components/children.
- **Attribute context never accepts raw values** — `href={raw(...)}` still
  escapes; the boundary exists only in child position.
- No sanitizer or trusted-types polyfill is bundled (v0.1 scope decision):
  the caller who writes `raw()` owns sanitization; escaped children and
  components are the documented safe alternatives.
- `tools/security/raw-html-audit.ts` (`bun run security:raw-html-audit`)
  scans packages/examples/tools/tests for real `raw(`/`unsafeHtml(` call
  expressions (comment/string lines and identifier-suffixed matches excluded)
  and prints file:line for every non-test call site.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/jsx typecheck
  -> exit 0

$ bun test ./packages/jsx
  62 pass, 0 fail, 2036 expect calls (7 raw-html security tests + prior)
  -> exit 0

$ bun run security:raw-html-audit
  raw-html audit: 0 source call site(s)
  raw-html audit: no raw usage outside tests — every rendered string escapes by default
  -> exit 0

$ bun test
  167 pass, 0 fail, 2347 expect calls across 25 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (29 files) / pack:inspect @bundar/jsx / build / format:check / test:consumer:jsx
  -> exit 0
```

## Acceptance evidence

- Ordinary strings always escape: `<script>` renders fully entity-escaped.
- Only branded values bypass: the identical payload via `raw()` passes verbatim —
  for **script, SVG, attribute-injection, comment, and closing-tag payloads**
  (all five classes asserted both ways).
- Brand cannot be forged: spread, plain shape, and JSON impostors all rejected.
- Attribute-position raw is escaped (no `href="javascript:..."` bypass).
- Audit reports zero non-test call sites in the current tree.
- No mandatory test failure hidden, skipped, or downgraded.

## Residual risks

- A caller passing attacker-controlled strings through `raw()` bypasses
  escaping by design; the audit tool exists to keep such sites reviewable,
  and application sanitization remains the caller's responsibility.
- `Symbol.for` registration means another realm's `raw()` output is accepted;
  cross-realm trust is equivalent to same-realm trust by symbol registry.
