# GH-012 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-012-route-descriptor-types`

## Planned verification commands

```text
$ bun test ./packages/core/test/types/route-descriptor.test-d.ts
 9 pass
 0 fail
 23 expect() calls
  -> exit 0

$ bun run typecheck
  -> exit 0
```

Tooling decision (documented per the issue's placeholder rule): Bun 1.4 test
discovery does not match `.test-d.ts` filenames, and a bare filter argument is
treated as a name filter rather than a path. The planned file is therefore
executed with an explicit `./`-prefixed path (identical file, identical
command semantics), and `packages/core/test/types/route-descriptor.test.ts`
re-registers the module so every normal `bun test` run executes its runtime
suite too. The compile-time assertions are enforced by `tsc --noEmit`: the
root tsconfig now includes `packages/*/test/**/*.ts`, so `bun run typecheck`
fails on any broken type expectation.

## Type model delivered (`packages/core/src/routing/types.ts`)

- `HTTP_METHODS` / `isHttpMethod` / `HttpMethod` — exactly the methods
  representable in `Bun.serve` route tables (GET, HEAD, POST, PUT, PATCH,
  DELETE, OPTIONS); CONNECT/TRACE intentionally absent.
- `RouteParams<Path>` — literal `:param` inference to `{ name: string }`;
  parameters are always strings. `/users/:id` → `{ id: string }`;
  `/users/:userId/posts/:postId` → `{ userId: string; postId: string }`;
  paths without parameters (including `/` and trailing-`*` wildcards) →
  empty.
- `ValidateRoutePath<Path>` — documented behavior for wildcard and
  optional/unsupported patterns: bare final `*` valid; `*` elsewhere
  (including `/*double`, `/a/*/b`) rejected; `:opt?`/`:opt+` optional
  parameters rejected; empty segments rejected; missing leading `/`
  rejected; empty parameter names rejected. Trailing slash tolerated here
  and delegated to the GH-014 runtime normalizer.
- `RouteHandler<Params>` — `(request, params) => Response | Promise<Response>`
  only (ADR-0016; no implicit return-value language).
- `RouteMethods<Methods>` — const tuples keep literal types; duplicate
  methods collapse to the `"route methods must not contain duplicates"`
  error literal; unbounded arrays pass through (runtime check is GH-014).
- `RouteMetadata` — read-only, arbitrary, never affects dispatch.
- `HandlerRoute` / `StaticRoute` / `RouteDescriptor` — callable handlers and
  startup-constructed static `Response` entries modeled as separate members.

## Adversarial probes

1. Corrupted expectation probe: changing
   `RouteParams<"/users/:id">`'s expectation to `{ id: number }` made
   `bun run typecheck` fail with two errors (exit 2); restoring it returned
   exit 0. The suite is enforced, not decorative.
2. `@ts-expect-error` probes: unused directives are themselves errors
   (TS2578), so the negative tests (duplicate methods in one descriptor;
   invalid method `"FETCH"` against the `HttpMethod` constraint) fire only
   while the violations genuinely fail to compile.
3. Three defects were found and fixed by the type tests during development:
   bare `*` was swallowed by the `` `*${string}` `` catch before the
   valid-trailing-wildcard branch; `Simplify<unknown>` did not normalize to
   an empty record (base changed to `Record<never, never>`); the duplicate
   methods `@ts-expect-error` had to sit on the `methods:` property line
   where the error is reported.

## Regression battery

`format:check`, `lint`, package typecheck, root typecheck,
`architecture:check` (8 source files, 7 rules — the new `src/routing/types.ts`
is scanned), `pack:inspect @bundar/core` (0 runtime dependencies; packed
files README.md, package.json, src/index.ts, src/routing/types.ts — all
inside the `files` allow-list), `bun test` (44 pass / 0 fail — 35 prior + 9
new), `build` (core now bundles 2 modules, 244 bytes), frozen install,
`docs:validate`/`docs:links`/`issues:graph`/`docs:check` — all exit 0.

## Residual risks

- `ValidateRoutePath` cannot see a stray `:` inside a static segment (for
  example `/a:b`); that and identifier-charset strictness are delegated to
  the GH-014 runtime path validator.
- Wildcard request-value exposure (how `Bun.serve` surfaces a matched `*`)
  is deliberately not modeled in `RouteParams`; GH-015 records it against
  real Bun behavior before any handler signature depends on it.
- Duplicate-method detection covers const tuples only; dynamic arrays are
  GH-014 runtime scope.
- No routing runtime exists yet by design; nothing in this change dispatches,
  matches paths, or parses bodies.
