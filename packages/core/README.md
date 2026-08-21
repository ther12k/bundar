# @bundar/core

Bundar HTTP core package.

- Surface (GH-012): the typed route model — `HTTP_METHODS`/`isHttpMethod`,
  `HttpMethod`, `RouteParams` (literal `:param` inference), `RouteHandler`
  (`Response | Promise<Response>` only, per ADR-0016), `RouteMethods`
  (duplicate rejection for const tuples), `ValidateRoutePath` (documented
  path/wildcard/optional-pattern behavior), `RouteMetadata`, and the
  `HandlerRoute`/`StaticRoute`/`RouteDescriptor` unions with `Response`
  static entries modeled separately from callable handlers.
- Surface (GH-013): `App` verb helpers, descriptor registration, grouped
  prefixes, module mounting, `RouteModule`, and defensive deterministic
  `RouteManifest` snapshots. Registration does not call `Bun.serve`.
- Surface (GH-014): `normalizeRoutePath`, descriptor normalization, and
  deterministic path/method conflict diagnostics. Only Bun-native-style
  parameters and bare final wildcards are accepted; native route compilation
  remains GH-015.
- Not implemented yet (by design): compilation to `Bun.serve` route tables,
  context, middleware, and error handling land with GH-015 and GH-017–GH-022.
- Runtime dependency policy: zero runtime dependencies
  (`decisions/0011-zero-runtime-deps.md`), enforced by tests, the
  architecture boundary check, and `bun run pack:inspect @bundar/core`.
- Package surface: `exports["."]`, `types`, and `main` point at
  `./src/index.ts`; published files are allow-listed in `files` and verified
  by packing.
- Type tests: `packages/core/test/types/route-descriptor.test-d.ts` is
  enforced by `tsc --noEmit` and run by Bun through its explicit path
  (discovery does not match `.test-d.ts`); `route-descriptor.test.ts`
  re-registers it for normal `bun test` runs.
- Publishing: stays `private` until the M6 packaging gates (GH-084–GH-086).
