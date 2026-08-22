# GH-035 verification transcript — typed common HTMX attributes

## Issue

[GH-035 — Add typed common HTMX attributes without runtime
coupling](../../issues/m2/gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md)
(branch `gh-035-typed-htmx-attrs`, worktree `bundar-gh-035`, base commit
`6a93425` = main after the GH-034 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3` (TSX via `react-jsx` +
  `jsxImportSource: "@bundar/jsx"`); ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/jsx `0.0.0` — zero runtime dependencies on @bundar/htmx or htmx
  (pack:inspect green; architecture check green — lowercase `hx-*` attribute
  names are not protocol strings; raw `HX-*`/`htmx:*` confinement to
  @bundar/htmx still enforced, 8 rules, 62 source files).
- htmx attribute semantics documented against both dialect profiles
  (htmx `2.0.10` stable and `4.0.0-beta6` experimental).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/jsx/src/types/htmx.ts` (new): `HtmxStableAttributes` — the
  stable dialect-common subset with string-literal types where the grammar
  enumerates (`hx-swap` bases plus open modifiers, `hx-target`
  selector/`this`/`closest x`/`find x`/`next`/`previous`, `hx-encoding`,
  `hx-boost`, `hx-validate`, `hx-preserve`…) and documented open strings
  where it does not (`hx-trigger`, `hx-headers`, `hx-sync`, `hx-params`).
  `HtmxExperimentalAttributes` — a deliberately-empty interface (the one
  eslint suppression is justified in source): apps enable experimental or
  dialect-specific attributes per compilation via declaration merging;
  nothing global widens. `HtmxAttributes` composes the two.
- `packages/jsx/src/types/intrinsic.ts` (new): element attribute maps moved
  out of types.ts; `HTMLAttributes` gains `& HtmxAttributes` so every
  intrinsic element typechecks the common subset; element-specific maps
  unchanged.
- `packages/jsx/src/types.ts`: re-exports (types/htmx + types/intrinsic);
  `packages/jsx/src/index.ts`: public type exports.
- `packages/jsx/tsconfig.json` + root `tsconfig.json`: `react-jsx` +
  `jsxImportSource: "@bundar/jsx"` so TSX type fixtures compile in-project.
- Tests: `packages/jsx/test/types/htmx-attributes.test-d.tsx` (type-level:
  positives compile; five `@ts-expect-error` rejections — bad `hx-encoding`,
  bad swap base, bare `closest `, string `hx-boost`, unknown experimental
  attribute — plus the declaration-merging opt-in proof) and
  `htmx-attributes.test.ts` (runtime: names pass through unchanged in the
  renderer's sorted order, values escape, boolean/empty-string semantics,
  server-only event handlers still fail closed).
- `packages/jsx/README.md`: typed-attributes section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/jsx/test/types/**` (as
   `bun test ./packages/jsx/test/types`) — exit 0; 5 runtime tests, 0 fail.
3. Type-level contract via `bun run --filter @bundar/jsx typecheck` — exit 0
   (every `@ts-expect-error` is load-bearing: an unused directive is a
   compile error, so the fixture cannot silently rot) and root
   `bun run typecheck` — exit 0.
4. `bun run architecture:check` — exit 0 (62 source files, 8 rules).
5. `bun run pack:inspect @bundar/jsx` — exit 0 (zero runtime dependencies).
6. `bun run test:consumer:jsx` — exit 0 (external consumer TSX compile
   unaffected by the new attributes).
7. `bun run lint`, `bun run format:check` — exit 0.
8. `bun test` (full) — exit 0; 496 tests across 61 files, 0 fail, 3,271
   expect() calls.
9. `bun run build` — exit 0. `bun run docs:validate` (211 documents) and
   `docs:links` (1,090 links) — exit 0.

### Tooling decisions

- The planned `bun test packages/jsx/test/types/htmx-attributes.test-d.ts`
  path is implemented as `.test-d.tsx`: attribute types are enforced only
  through TSX syntax (the `jsx()` function is deliberately loose —
  `Record<string, unknown>`), so the type-level fixture uses TSX compiled
  by the package/root typecheck rather than a bun-executed test. The
  runtime assertions live in the sibling `.test.ts`. This is
  equivalent-or-stronger evidence: unused `@ts-expect-error` directives are
  themselves compile errors.
- The suggested `packages/jsx/src/types/intrinsic.ts` was used; the stable
  subset and the experimental augmentation point are separated exactly as
  the deliverable requires.

## Acceptance evidence mapping

- "Common htmx attributes typecheck in normal intrinsic elements" — TSX
  fixture positives across button/div/a/form/input/span.
- "Unknown experimental attributes can be enabled deliberately without any
  leaking globally" — `@ts-expect-error` proves an unknown `hx-on:load` is
  rejected; declaration merging enables `hx-on:click` for that compilation
  only; the empty interface is the sole, justified eslint suppression.
- "JSX package has no runtime dependency on @bundar/htmx or htmx" —
  pack:inspect (zero deps) + architecture check (no such edge exists in the
  frozen rules).
- "Generated HTML does not rewrite attribute names" — runtime test asserts
  byte-exact output (`hx-get="/items"` … in sorted order, untouched).
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — jsx README, closure record below, `issues/m2/index.md`,
  `log.md`, this transcript.

## Residual risks and deviations

- Open-string attributes (`hx-trigger`, `hx-headers`, `hx-sync`, …) are
  typed as strings by design; validating their grammar belongs to the
  dialect adapters (@bundar/htmx), never the JSX runtime — documented.
- Experimental attributes enabled by an app apply to that app's compilation
  only; misconfiguration is a type error at the app, not a runtime failure.
- Root tsconfig now compiles TSX with `jsxImportSource: "@bundar/jsx"`
  (path-mapped); non-JSX files are unaffected.

## Newly unblocked

- GH-036 (JSX conformance/security/snapshot coverage — its dependencies
  GH-031/033/035 are now all complete), GH-047, GH-051.
