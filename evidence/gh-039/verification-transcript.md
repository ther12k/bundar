# GH-039 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-039-htmx-package`

## Delivered contract

`@bundar/htmx` provides:
- Version-neutral protocol model in `@bundar/htmx` (`HTMX_REQUEST_HEADERS`, `HTMX_RESPONSE_HEADERS`, `isHtmxRequest`, `isBoostedRequest`, `getHtmxTarget`, `getHtmxTrigger`, `withHtmxHeaders`).
- Stable htmx 2 dialect adapter in `@bundar/htmx/2` pinned to `2.0.10`.
- Experimental htmx 4 dialect adapter in `@bundar/htmx/4` pinned to `4.0.0-beta6` with explicit `experimental: true` marking and non-GA notices.
- Zero runtime dependencies, no core or JSX imports.

## Exact verification commands

```text
$ bun run --filter @bundar/htmx typecheck
  -> exit 0

$ bun test ./packages/htmx
  6 pass, 0 fail, 23 expect calls
  -> exit 0

$ bun test ./tests/consumer/htmx
  1 pass, 0 fail
  -> exit 0

$ bun run architecture:check
  architecture:check: ok (18 source files, 7 package rules enforced)
  -> exit 0

$ bun run pack:inspect @bundar/htmx
  runtime dependencies: 0
  packed 6 files: README.md, package.json, src/index.ts, src/neutral.ts, src/v2.ts, src/v4.ts
  -> exit 0

$ bun run build
  -> exit 0
```

## Acceptance evidence

- Core and JSX do not import `@bundar/htmx` (enforced by `architecture:check`).
- Applications select dialect through explicit import: `@bundar/htmx/2` or `@bundar/htmx/4`.
- Experimental v4 exports are visibly marked with `experimental: true` and pinned to `4.0.0-beta6`.
- Package metadata explicitly avoids claiming GA support for htmx 4.
- All tests and validation pass cleanly.
