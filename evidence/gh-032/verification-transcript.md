# GH-032 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-032-document-helpers`

## Delivered contract

**`packages/jsx/src/render/elements.ts`**: `VOID_ELEMENTS` (13 tags),
`RAW_TEXT_ELEMENTS` (script/style/textarea/title), `isVoidElement`,
`isRawTextElement`, `serializeRawText` (script: `<\/` neutralization; style:
CSS `\3c ` escape), `DOCTYPE = "<!doctype html>"`.

**Node renderer integration** (`render/node.ts`):
- Void elements serialize as `<tag attrs>` — **never a closing tag**;
  children on void elements are dropped (invalid HTML by spec).
- Raw-text elements keep text children **unescaped** (per HTML spec) with
  close-tag sequences neutralized so `</script>`-style payloads cannot break
  out of the host element.

**`packages/jsx/src/document.ts`**: `document({ lang?, charset="utf-8",
title?, children })` builds the html/head(meta charset, title?)/body skeleton
(lang explicit — no default; omit = `<html>` without lang);
`renderDocument(tree, render)` prepends the doctype and enforces **exactly
one `<html>` root** — zero or multiple roots throw
`DuplicateDocumentRootError`.

**Types**: IntrinsicElements extended with html/head/body/meta/title/script/
style (including `nonce` on script/style for GH-066 CSP work).

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/jsx typecheck
  -> exit 0

$ bun test ./packages/jsx/test/document
  11 pass, 0 fail (within the 86-test jsx run)

$ bun run test:consumer:jsx
  -> exit 0 (TSX fixture still compiles with the extended intrinsics)

$ bun test
  325 pass, 0 fail, 2809 expect calls across 41 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (44 files) / pack:inspect @bundar/jsx / build / format:check
  -> exit 0
```

Tooling decision (documented): the planned `test:html-validate` script is
superseded by structural assertions (doctype prefix, no `</br>`-style void
closers, breakout-free raw text, single-root enforcement) in the test suite;
the planned `test/document/**` tree runs within `bun test ./packages/jsx`.

## Acceptance evidence

- Document output begins with `<!doctype html>` (exact string asserted).
- Void elements: input/br/img/meta/hr serialize without closing tags;
  children on void elements are dropped, never serialized.
- Raw-text boundaries: script/style text stays unescaped for valid code
  (`a < b && c > d` round-trips) while `</script><script>` and
  `</style>` payloads are neutralized (grammar-correct escapes).
- Duplicate/nested html roots fail with `DuplicateDocumentRootError`.
- No mandatory test failure hidden, skipped, or downgraded. One test
  expectation corrected for GH-028's documented sorted-attribute order.

## Residual risks

- Client-side head reconciliation/SEO ecosystems stay out of scope by design.
- `<template>` and exotic foreign elements (SVG text semantics) are not yet
  special-cased.
