# GH-026 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-026-jsx-package`

## Delivered contract

`@bundar/jsx` exports the automatic JSX runtime (`jsx`, `jsxs`, `Fragment`) and
development runtime (`jsxDEV`) with the `JSX` namespace required by TypeScript's
`react-jsx` transform. The package has three exports:

- `.` — main index with all public types
- `./jsx-runtime` — automatic transform entry with `JSX.IntrinsicElements`
- `./jsx-dev-runtime` — development transform entry

Zero runtime dependencies. No React, DOM, or hydration imports. HTML
serialization is explicitly deferred to GH-027 onward.

Client event handlers (`onClick`, `onChange`, `onInput`, `onSubmit`) are typed
as a guidance string literal (`UnsupportedClientEvent`) rather than function
types, so TSX authors receive an actionable message at the type level without
runtime cost.

The `JSX` namespace is declared in `jsx-runtime.ts` with an ESLint inline
disable comment; the comment explains that TypeScript's `react-jsx` transform
requires the `namespace JSX` at module level in the runtime entry and there is
no equivalent module-export alternative.

Tooling decision: `bun test packages/jsx` requires `./packages/jsx` (Bun
path), and `bun run test:consumer:jsx` wraps the consumer tsconfig compile.
Both are now explicit root scripts.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0; Bun 1.4.0 preflight passed

$ bun run --filter @bundar/jsx typecheck
  -> exit 0

$ bun test ./packages/jsx
  1 pass, 0 fail, 7 expect calls
  -> exit 0

$ bun run test:consumer:jsx  (= bunx tsc --noEmit -p tests/consumer/jsx/tsconfig.json)
  fixture.tsx compiles with jsxImportSource: "@bundar/jsx"
  unsupported onClick @ts-expect-error consumed correctly
  -> exit 0

$ bun run lint
  -> exit 0

$ bun run typecheck
  -> exit 0

$ bun run architecture:check
  architecture:check: ok (15 source files, 7 package rules enforced)
  -> exit 0

$ bun run pack:inspect @bundar/jsx
  runtime dependencies: 0; 6 packed files within allow-list
  -> exit 0

$ bun run build
  all workspace packages built successfully
  -> exit 0
```

## Acceptance evidence

- TSX fixture compiles: `jsxImportSource: "@bundar/jsx"` resolves `jsx-runtime`
  and the full intrinsic element set (`main`, `h1`, `form`, `label`, `input`,
  `button`, `p`, fragment) without React.
- No React package or type dependency: zero `dependencies` in the manifest;
  architecture check passes.
- Runtime dependencies: 0
- Client event guidance: `onClick={() => undefined}` produces a type error;
  `@ts-expect-error` on the next line is consumed. Guidance message is the
  `UnsupportedClientEvent` literal.
- No mandatory failure was hidden or downgraded.

## Residual risks

- HTML serialization is deferred to GH-027; current package only defines the
  node type surface and runtime factory.
- The intrinsic element list covers a representative but non-exhaustive set of
  HTML elements; full coverage is GH-027–GH-028 scope.
