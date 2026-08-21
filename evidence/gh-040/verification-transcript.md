# GH-040 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-040-htmx-dialect-interface` (rebased onto post-GH-027 main)

## Delivered contract

`packages/htmx/src/dialect.ts` defines the capability-aware `HtmxDialectAdapter` interface: identity (`id`, `displayName`), maturity, exact `supportedRange`, a complete `CapabilityMap`, namespaced `metadata`, and four data-oriented methods — `decodeRequest`, `encodeResponseDirective`, `describeAsset`, `diagnose`. `packages/htmx/src/capabilities.ts` provides `capabilities()` (fails closed on incomplete maps) plus `isNative`/`isEmulated`/`isUnsupported`.

- `htmx2` now implements the adapter: stable, `>=2.0.0 <3.0.0`, all capabilities native, pinned asset metadata `2.0.10` with the GH-008 SHA-256.
- `htmx4Experimental` implements it as experimental with an explicit `htmx4:gaClaim: none` metadata string; `trigger-after-swap`/`trigger-after-settle` are emulated and `cache-control` unsupported, reflecting GH-008 beta observations rather than hiding them.
- Neutral types: `HtmxRequestMetadata` (frozen record), `HtmxResponseDirective` (discriminated union over all directive kinds), `HtmxAssetDescriptor`, `HtmxCompatibilityDiagnostic`.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/htmx typecheck
  -> exit 0

$ bun test ./packages/htmx
  15 pass, 0 fail, 75 expect calls (6 neutral + 9 dialect-contract)
  -> exit 0

$ bun run test:types
  9 pass, 0 fail, 23 expect calls
  -> exit 0

$ bun run typecheck / lint / architecture:check / pack:inspect @bundar/htmx / build / format:check
  -> exit 0 (architecture: 25 source files, 7 rules; pack: 0 runtime deps)

$ bun run docs:validate / docs:links
  -> exit 0
```

## Acceptance evidence

- Synthetic third dialect: `dialect-contract.test.ts` implements a complete
  `synthetic-hx` adapter in test code with its own capability map and
  namespaced metadata — no core type changed.
- No v2-only/v4-only interface fields: an explicit test enumerates adapter
  keys and rejects `htmx2*`/`htmx4*`/`v2*`/`v4*` shapes; dialect detail lives
  under `htmx2:`/`htmx4:` namespaced metadata keys.
- Capabilities distinguish native/emulated/unsupported: htmx2 all-native;
  htmx4 emulated after-swap/after-settle and unsupported cache-control with
  GA-gated diagnostics.
- Adapters immutable and reusable: `Object.isFrozen` assertions on adapter,
  capability map, and metadata; decode purity verified across three requests
  (same input → equal output, no cross-request state).
- No mandatory test failure hidden, skipped, or downgraded. The GH-039-era
  descriptor fields (`version`/`experimental`/`pinnedVersion`) were superseded
  by the adapter interface; the GH-039 guarantee (stable pin, experimental
  marking) is re-asserted against `maturity` and namespaced metadata.

## Residual risks

- Full request-metadata decoding and response-directive encoding behaviors
  beyond the neutral mapping are GH-041/GH-042 scope; the adapter methods here
  provide the interface and the v2/v4 baseline implementations.
- Event normalization and inheritance/extension helpers are GH-046/GH-047.
