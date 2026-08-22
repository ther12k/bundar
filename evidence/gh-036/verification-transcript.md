# GH-036 verification transcript — JSX conformance, security, and snapshot coverage

## Issue

[GH-036 — Close JSX conformance, security, and snapshot
coverage](../../issues/m2/gh-036-close-jsx-conformance-security-and-snapshot-coverage.md)
(branch `gh-036-jsx-conformance`, worktree `bundar-gh-036`, base commit
`53ec1a3` = main after the GH-035 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/jsx `0.0.0` (zero runtime dependencies; pack:inspect green).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`
  via the playwright CLI (DOM comparison runner).
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- **Conformance matrix** (`packages/jsx/test/conformance/matrix.test.ts`):
  every public renderer primitive (jsx/jsxs/jsxDEV/Fragment, renderToString
  sync + async + auto, renderNode, renderToStream, streamResponse,
  fragment/page, document, raw, escape/serialize helpers) exercised with a
  positive AND a negative assertion in one registry.
- **Snapshot corpus with review policy**
  (`packages/jsx/test/conformance/snapshots.{test.ts,cases.ts,snapshots.json}` +
  `tools/jsx-snapshots.ts` + `snapshots:jsx` script): 13 representative
  trees rendered byte-exactly; regeneration REFUSES to run without
  `--reviewed-by <name>` and bumps `snapshotVersion`, writing the reviewer
  and timestamp into the committed file — blind updates are structurally
  impossible; without `--regenerate` the tool exits 2 with instructions.
- **Property tests** (`packages/jsx/test/fuzz/property.test.ts`): seeded
  deterministic PRNG (mulberry32, seed recorded) over 400 hostile strings —
  escaping closure (no raw `<`/`>`; every `&` opens a known entity),
  attribute quoting integrity, markup-injection impossibility in text
  children, render purity/determinism, sync/async/stream byte parity,
  fragment content-type invariants. ~6,000 assertions in ~120 ms.
- **Security corpus audit** (`tools/security/jsx-corpus.ts` +
  `security:jsx` script + `evidence/gh-036/security-corpus.json`): 13
  hostile payloads (including raw-text breakouts `</title>`, `</textarea>`,
  `</style>`) across text, attributes (exact escaped-value equality),
  raw-text elements, documents (single root + no breakout sequence), async,
  and streaming; `raw()` trust stays branded.
- **Browser DOM comparison** (`tests/browser/jsx/{server,run}.ts` +
  `test:browser:jsx` script): six edge cases parsed by a real browser and
  asserted — void elements have no DOM children, script raw-text keeps
  content with neutralized close-tags (exactly one script), attribute
  escaping round-trips through `getAttribute`, textarea RCDATA never gains
  markup children AND its value round-trips exactly, Unicode survives the
  parse untouched, `raw()` trusted markup renders exactly.
- **Real defect found and fixed by the browser comparison**: textarea/title
  are RCDATA (browsers decode character references), but the serializer
  applied script-style `<\/` grammar escapes — the browser displayed the
  literal backslashes (`<\/textarea>`) and the textarea VALUE did not
  round-trip. `serializeRawText` now entity-escapes RCDATA hosts
  (`&`→`&amp;`, `<`→`&lt;`), which is lossless in RCDATA; script/style keep
  their grammar escapes. The browser comparison pins the round-trip.
- **Intrinsic element set completed** (`ul`, `li`, `table` family, `img`,
  `select`/`option`/`textarea`, headings, media, etc. — the runtime always
  rendered any tag; the type map now matches common HTML); `hx-target`
  widened to accept arbitrary CSS selectors (its primary htmx form) while
  keeping modifier-literal completions — grammar validation stays with the
  dialect adapters.
- **Consumer compile fixture extended** (`tests/consumer/jsx/fixture.tsx`):
  typed `hx-*` attributes and `streamResponse` compile in an external
  consumer.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/jsx` — exit 0; 146 tests across 18 files, 0 fail,
   6,371 expect() calls (conformance 13, property 11, security suites,
   streaming, types, and all prior coverage).
3. `bun run test:consumer:jsx` — exit 0 (external TSX compile with hx
   attributes + streamResponse).
4. `bun run test:browser:jsx` — exit 0; "DOM interpretation matches
   intended structure for all edge cases" (artifacts under
   `output/playwright/jsx/`).
5. `bun run security:jsx` — exit 0; 13 hostile payloads pass; artifact
   `evidence/gh-036/security-corpus.json`.
6. `bun run snapshots:jsx` (no flags) — exit 2 with instructions (the
   review gate provably refuses blind runs).
7. `bun run --filter @bundar/jsx typecheck` and root `bun run typecheck` —
   exit 0 (includes the TSX type fixture and new tests).
8. `bun run lint`, `bun run format:check` — exit 0.
9. `bun test` (full) — exit 0; 516 tests across 64 files, 0 fail, 7,470
   expect() calls.
10. `bun run architecture:check` — exit 0 (62 source files).
11. `bun run pack:inspect @bundar/jsx` — exit 0. `bun run build` — exit 0.
    `bun run docs:validate` (211 documents) / `docs:links` (1,090 links) —
    exit 0.

### Tooling decisions

- The planned `bun run test:browser:jsx` command was added verbatim as a new
  dedicated runner (its own edge-case server; no htmx asset needed).
- The planned `bun run security:jsx` command was added verbatim as the
  corpus audit script above.
- Determinism: snapshots and property tests use fixed data and a recorded
  PRNG seed; no timestamps, locales, or map-order dependencies (snapshots
  sorted by case name).

## Acceptance evidence mapping

- "Every public renderer primitive has positive and negative tests" — the
  matrix registry lists each primitive with both directions.
- "Security payload corpus passes with expected escaping" — `security:jsx`
  (exact escaped-value equality, breakout-neutralization checks, branded
  raw) plus the property suite's closure invariants.
- "Snapshots are deterministic across supported platforms" — the corpus is
  a committed JSON keyed by sorted case names with pure-function fixtures;
  only Bun/linux was available in this environment — cross-platform runs
  will byte-compare the same corpus (residual noted).
- "Browser DOM interpretation matches intended structure for selected edge
  cases" — `test:browser:jsx` (six edge cases in Chrome for Testing).
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped; the
  one defect found (RCDATA display corruption) was FIXED, not asserted
  around.
- OKF/log updates — closure record below, `issues/m2/index.md`, `log.md`,
  this transcript, corpus artifact.

## Residual risks and deviations

- Snapshot determinism is verified on Bun/Linux only (the only available
  platform); the corpus contains no platform-dependent constructs (no
  locale/time), so byte-stability is by construction, not by test matrix.
- `hx-target` accepts any string (selectors are its primary form); grammar
  validation remains the dialect adapters' responsibility — documented in
  the type.
- RCDATA escaping now relies on entity decoding by the browser (spec
  behavior); the browser comparison pins it for textarea/title.
- The intrinsic element map covers common HTML; exotic tags fall back to
  the loose `jsx()` typing (runtime renders any tag).

## Newly unblocked

- GH-037 (M2 JSX performance and memory gate) and GH-038 (M2 server-JSX
  gate record) — every M2 implementation issue is now complete.
