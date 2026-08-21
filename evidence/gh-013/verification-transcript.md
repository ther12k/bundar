# GH-013 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-013-app-builder`

## Delivered contract

`@bundar/core` now exports `App`, `RouteModule`, `RouteManifest`,
`defineModule`, `joinRoutePath`, `cloneRouteDescriptor`, and `freezeManifest`.
The builder supports descriptor registration, `get`/`head`/`post`/`put`/`patch`/
`delete`/`options`, grouped prefixes, module mounting, and deterministic
pre-compilation manifests. Registration does not call `Bun.serve`; middleware,
request context, path conflict validation, and native route compilation remain
later issue scope.

Manifests and modules are defensive snapshots: route objects, method arrays, and
metadata copies are frozen; mounting clones descriptors and leaves the source
module unchanged. The builder deliberately uses a stable mutable facade rather
than an accumulating route-list generic, in line with the type-system policy.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0; Bun 1.4.0 preflight passed

$ bun test ./packages/core/test/app-builder.test.ts
  4 pass, 0 fail, 13 expect calls
  -> exit 0

$ bun run test:types
  9 pass, 0 fail
  -> exit 0

$ bun run typecheck:perf
  typecheck passed within the 10000ms documented local budget
  -> exit 0

$ bun run --filter @bundar/core typecheck
  -> exit 0

$ bun run typecheck
  -> exit 0

$ bun test ./packages/core
  17 pass, 0 fail, 43 expect calls
  -> exit 0

$ bun run lint
  -> exit 0

$ bun run architecture:check
  architecture:check: ok (10 source files, 7 package rules enforced)
  -> exit 0

$ bun run pack:inspect @bundar/core
  runtime dependencies: 0; packed source and README only
  -> exit 0

$ bun run build
  @bundar/core bundled successfully; all workspace packages built
  -> exit 0
```

## Acceptance evidence

- Grouped prefixes: nested `/api/` + `/v1` + `users` produces `/api/v1/users`.
- Source immutability: mounting a module at `/admin` leaves its source path and
  metadata unchanged and produces `/admin/users/:id` in the target manifest.
- Determinism: registration order and method arrays are stable in the manifest;
  repeated module manifests are separate frozen snapshots.
- Type-system budget: root `typecheck` is measured by `typecheck:perf` against a
  10-second local budget; no unbounded route-list generic is introduced.
- No mandatory failure was hidden. The original issue commands were made
  executable through explicit workspace scripts; Bun's path-filter behavior and
  the tooling decision are captured above rather than silently omitted.

## Residual risks

- Runtime path syntax validation and duplicate/conflict diagnostics are GH-014.
- Native `Bun.serve({ routes })` compilation and wildcard runtime behavior are
  GH-015.
- `Response` detection uses the standards `Response` constructor; custom
  response-like objects must use a descriptor form until later response-helper
  issues define that contract.
