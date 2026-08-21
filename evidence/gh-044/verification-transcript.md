# GH-044 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-044-htmx4-adapter`
- Browser evidence base: Playwright Chromium 1237 lane (GH-008)

## Delivered contract

`packages/htmx/src/dialects/v4/index.ts` (re-exported from `@bundar/htmx/4`):

- Identity: `maturity: "experimental"`, exact pin `4.0.0-beta6`
  (`HTMX4_TESTED_VERSION`), supported range `>=4.0.0-beta.0 <4.1.0`,
  asset integrity = the GH-008 SHA-256.
- `HTMX4_PROFILE`: every provisional field annotated `[provisional]`;
  `gaClaim` states no GA compatibility claim and that **GA revalidation is
  mandatory** before any stable promotion.
- Request mapping: `HX-Source` (beta6) aliases onto the neutral
  `sourceElement`; representation semantics recorded as v2-identical
  (provisional). Response directives share the neutral GH-042 encoder.
- Lifecycle: GH-008 evidence recorded — beta6 did not fire the v2 lifecycle
  event string (`observedAfterRequest: false`); after-swap/after-settle are
  **emulated** capabilities pending GA evidence (GH-054 fixture lane).
- Migration differences: five records (lifecycle events, error-swap default
  change, attribute-inheritance removal, extensions API rework, cache-control
  absence), each with `fixture:` or `record` status.
- Capabilities: cache-control **unsupported**; after-swap/after-settle
  **emulated**; rest native. Diagnostics repeat the GA warning.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/htmx typecheck
  -> exit 0

$ bun test ./packages/htmx/test/v4
  13 pass, 0 fail (within the 63-test htmx run)

$ bun run test:browser:htmx4
  -> exit 0 (existing pinned beta6 lane; version/integrity re-affirmed)

$ bun test
  250 pass, 0 fail, 2600 expect calls across 32 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (36 files) / pack:inspect @bundar/htmx / build / format:check
  -> exit 0
```

Tooling decisions (documented): planned `test:browser:htmx4 -- protocol` runs
as the existing pinned beta6 browser lane; planned `htmx:profile-report --
v4` is superseded by the machine-readable `HTMX4_PROFILE` constant asserted
in tests.

## Acceptance evidence

- Identity includes experimental maturity + exact beta version; asset version
  is `4.0.0-beta6` and never written as `4.0.0`.
- Beta behavior cannot alter v2: separate frozen adapters/capability maps;
  v2 stays stable-native; `HX-Source` decodes under v4 while the same request
  decodes absent under v2; shared directive encoder produces identical
  headers.
- Every known migration difference has a fixture reference or an explicit
  unsupported record (≥5 asserted with topic/difference/status).
- Documentation warns GA revalidation is mandatory (gaClaim string, asserted;
  diagnostics repeat it).
- No mandatory test failure hidden, skipped, or downgraded. One profile
  string was strengthened (mandatory-revalidation wording) and one test
  assertion fixed (array search) — behavior unchanged.

## Residual risks

- All beta6 observations are provisional; the GH-054 browser conformance
  profile and the M7 GA gates (GH-089–GH-096) must revalidate every field.
- Streaming/partials capabilities are recorded but unimplemented (GH-034/GH-051).
