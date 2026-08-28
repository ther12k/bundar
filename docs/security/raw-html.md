# Raw HTML trust boundary

Bundar's server renderer escapes every string by default. The only way to emit
markup verbatim is the explicit `raw()` API from `@bundar/jsx`:

```tsx
import { raw } from "@bundar/jsx";

const trusted = raw("<b>pre-sanitized</b>");
```

## Exact guarantee

- A value is treated as trusted HTML only if it was constructed by `raw()`
  inside this package.
- The runtime marker is a module-private unique symbol. It cannot be
  reconstructed from a string key (`Symbol.for`), copied by spread, restored
  from JSON, or inherited through a prototype chain.
- Any other object shape passed to a text position fails closed with an
  error rather than rendering.

## Responsibility

Bundar ships **no HTML sanitizer**. Whoever calls `raw()` owns sanitization of
its argument. Prefer escaped children or components; reach for `raw()` only
for markup you fully control or have sanitized with an audited tool.

## Audit

Raw call sites are tracked by `bun run security:raw-html-audit`, and the
forgery surface is pinned by `packages/jsx/test/security/raw-html-forgery.test.ts`.
