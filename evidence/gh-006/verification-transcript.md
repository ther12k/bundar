# GH-006 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Current implementation commit: `b6f1e96`
- Main merge commit: `abb6041`

## Commands

```text
$ bun test tests/architecture
13 pass
0 fail
16 expect() calls
  -> exit 0

$ bun run architecture:check
architecture:check: ok (7 source files, 7 package rules enforced)
  -> exit 0
```

## Harness coverage

The architecture harness includes adversarial fixtures for:

- core importing an HTMX dialect;
- JSX importing core;
- approved HTMX-to-JSX direction;
- React imports;
- hydration runtime imports;
- dynamic external imports;
- Bun and Node builtin imports;
- raw `HX-*` header access outside `@bundar/htmx`;
- raw `htmx:*` lifecycle event names outside `@bundar/htmx`;
- valid raw HTMX strings inside the adapter;
- relative imports escaping a package; and
- valid relative imports within a package.

The real repository scan passes all frozen boundary rules. The test suite fails
closed for forbidden fixtures and requires a valid package graph for the real
workspace.

## Scope and residual risk

This evidence covers the configured Linux environment. The checker is a
source-text/import-graph enforcement layer, not a full semantic compiler or a
claim of cross-platform hosted CI execution. It adds the stricter harness that
GH-005 identified as follow-up to its boundary engine. No runtime framework API,
security certification, or performance claim is made.
