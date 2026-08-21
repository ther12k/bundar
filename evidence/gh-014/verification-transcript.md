# GH-014 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-014-path-conflicts`

## Delivered contract

`@bundar/core` now exports `normalizeRoutePath`, descriptor normalization,
`RoutePathValidationError`, `validateRouteConflicts`,
`assertRouteConflictsFree`, `RouteConflictError`, and `RouteValidationError`.

Normalization treats `/`, repeated separators, and a trailing slash as one
canonical path. It accepts only Bun-native-style `:identifier` parameters and a
bare final `*` wildcard. Empty paths, missing leading slashes, empty parameters,
optional parameters, wildcard fragments/non-final wildcards, invalid parameter
names, and stray colons in static segments fail before compilation.

Conflict validation keys declarations by normalized path and HTTP method. It
rejects duplicate registrations, duplicate methods in one runtime descriptor,
invalid dynamic method values, and handler/static replacement on the same key.
Different methods may share a normalized path. Diagnostics carry both sanitized
caller labels where supplied; absolute path-like labels are replaced with
`<path>` and control characters are removed. Bun's own static/parameter
precedence is intentionally not reimplemented here; GH-015 preserves native
precedence when compiling route tables.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0; Bun 1.4.0 preflight passed

$ bun test ./packages/core/test/routing/conflicts.test.ts
  4 pass, 0 fail, 8 expect calls
  -> exit 0

$ bun test ./packages/core/test/routing/paths.test.ts
  3 pass, 0 fail, 13 expect calls
  -> exit 0

$ bun run typecheck
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun run lint
  -> exit 0

$ bun run architecture:check
  architecture:check: ok (12 source files, 7 package rules enforced)
  -> exit 0

$ bun run pack:inspect @bundar/core
  runtime dependencies: 0; 8 packed source/package files inside allow-list
  -> exit 0

$ bun test ./packages/core
  24 pass, 0 fail, 64 expect calls
  -> exit 0

$ bun run build
  all workspace packages built successfully
  -> exit 0
```

## Acceptance evidence

- Duplicate registrations fail deterministically with `RouteConflictError`.
- `/users`, `/users/`, and equivalent repeated-slash spellings collide after
  normalization; method-specific GET/POST declarations share a path safely.
- Handler/static replacement is diagnosed as `handler-static-mismatch`.
- Runtime method arrays are checked even when callers bypass TypeScript.
- Diagnostic messages do not include the supplied `/home/alice/...` path; it is
  represented by `<path>`.
- No mandatory test failure was hidden or downgraded.

## Residual risks

- Route matching and native precedence are not implemented here; GH-015 must
  verify them against real Bun `Bun.serve({ routes })` behavior.
- URL decoding, regex routes, optional parameters, and wildcard request-value
  typing remain intentionally unsupported/unmodeled until an issue authorizes
  them with Bun evidence.
