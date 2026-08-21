# GH-028 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-028-attribute-serialization`

## Delivered contract

`packages/jsx/src/render/attributes.ts` exports `serializeAttribute`,
`renderAttributes`, `serializeClass`, `serializeStyle`,
`validateAttributeName`, `isBooleanAttribute`, `BOOLEAN_ATTRIBUTES`, and
`UnsafeAttributeNameError`.

- Attribute names must match `/^[A-Za-z][A-Za-z0-9_:.-]*$/`; `on*` (case-insensitive) is rejected — inline event handlers never serialize.
- HTML boolean attributes (22-name set: `disabled`, `checked`, `hidden`, …): `true` → bare presence; `false`/`null`/`undefined`/`""` → omitted.
- Non-boolean `true` → bare presence; numbers stringify; all string values are attribute-escaped (both quote forms neutralized).
- `class`/`className` accept string, nested arrays (falsy entries dropped), or a record with boolean values; record form emits sorted tokens — deterministic regardless of key order.
- `style` accepts a trimmed string or a record; record form emits sorted `hyphen-case:value;` declarations (camelCase converted, numbers stringified).
- `renderAttributes` emits keys in sorted order with a leading space; `children`/`key` are skipped.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/jsx typecheck
  -> exit 0

$ bun test ./packages/jsx
  41 pass, 0 fail, 1975 expect calls
  (attributes/serialization 14 + security/attribute-injection 8 + prior suites)
  -> exit 0

$ bun test
  146 pass, 0 fail, 2286 expect calls across 23 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (27 files) / pack:inspect @bundar/jsx / build / format:check
  -> exit 0
```

Tooling decision (documented): planned `packages/jsx/test/attributes/**` and
`security/attribute-injection.test.ts` paths execute within `bun test
./packages/jsx` (Bun directory run covers both trees).

## Acceptance evidence

- Boolean semantics: `disabled=true` → ` disabled`; false/null/undefined/"" omitted; `READONLY` case-insensitive.
- Deterministic class/style ordering: record forms sorted; key order never affects output (explicitly asserted twice).
- Values cannot escape quoting: eight hostile payloads (quote-breakout, `"><script>`, entity-pretenders, SQL, Unicode-quote, `\u0022` spellings) each render exactly one `data-x=` occurrence with exactly the two delimiter quotes after entity removal, and no `<script` substring.
- `on*` rejected (`onclick`, `ONCLICK` → `UnsafeAttributeNameError`); malformed names rejected (empty, digit-start, leading `-`, space, `<`, `"`, `=`, `/`, NUL).
- data-/aria-/namespaced names accepted (`data-id`, `aria-label`, `xlink:href`).
- One initially over-strict test assertion was corrected: `javascript:x` is a legal namespaced attribute *name* (like `xlink:href`); URL dangers live in values, which are escaped. Implementation unchanged for that case.
- No mandatory test failure hidden, skipped, or downgraded.

## Residual risks

- URL-valued attributes (href/src) receive value escaping only; scheme policy is application/HTMX-scope work (GH-045/GH-049 neighborhood).
- SVG/MathML element-specific attribute semantics are not special-cased.
