# GH-047 verification transcript — inheritance and extension compatibility helpers

## Issue

[GH-047 — Add inheritance and extension compatibility helpers](../../issues/m3/gh-047-add-inheritance-and-extension-compatibility-helpers.md)
(branch `gh-047-inheritance`, worktree `bundar-gh-047`, base commit `0009361` = main after the GH-046 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` (depends on @bundar/core, @bundar/jsx, @bundar/schema), pinned dialect profiles htmx `2.0.10` / `4.0.0-beta6` (never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/inheritance.ts` (new):
  - `HTMX2_INHERITED_ATTRIBUTES`: set of attributes that inherit by default in htmx 2.
  - `formatDisinherit(attributes)`: formats `hx-disinherit` attribute string (`"hx-target hx-boost"` or `"*"`), rejecting empty lists.
  - `diagnoseInheritance(attribute, dialect)`: diagnoses whether an attribute inherits by default under htmx 2 vs htmx 4 explicit-by-default rules.
  - Error class: `InheritancePolicyError`.
- `packages/htmx/src/extensions.ts` (new):
  - `OFFICIAL_EXTENSIONS`: structured descriptors for `sse`, `ws`, `json-enc`, `response-targets`, `morphdom`, and `htmx-2-compat`.
  - `HTMX_2_COMPAT_EXTENSION`: migration reference extension descriptor for htmx 4 beta.
  - `formatExtensionAttribute(extensions)`: formats `hx-ext` attribute values.
  - `diagnoseExtension(extension, dialect)`: diagnoses dialect support (`native`, `emulated`, `unsupported`) and extracts migration notes.
  - `rawExtension(name)`: audited escape hatch for third-party or custom extensions.
  - Error class: `ExtensionPolicyError`.
- Tests: `packages/htmx/test/inheritance/inheritance.test.ts` (6 tests) and `packages/htmx/test/extensions/extensions.test.ts` (6 tests).
- Browser lanes: `tests/browser/run.ts` asserts `inheritance-disinherit` DOM attributes in both `htmx2` and `htmx4` browser lanes.
- `packages/htmx/README.md`: inheritance and extension compatibility section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/inheritance/** packages/htmx/test/extensions/**` — exit 0; 12 tests, 30 expect() calls, 0 fail.
3. `bun run test:browser:htmx2` / `htmx4` — exit 0; `inheritance-disinherit` scenario passed in both lanes (`output/playwright/*/inheritance.json`).
4. `bun run test:browser:report` — exit 0.
5. `bun run --filter @bundar/htmx typecheck` and root `bun run typecheck` — exit 0.
6. `bun run lint`, `bun run format:check` — exit 0.
7. `bun test` (full) — exit 0; 624 tests across 75 files, 0 fail, 7,762 expect() calls.
8. `bun run architecture:check` — exit 0 (73 source files).
9. `bun run pack:inspect @bundar/htmx` — exit 0.
10. `bun run build` — exit 0.
11. `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) — exit 0.

### Tooling decisions

- The planned `bun run test:browser:dual -- inheritance` runner does not exist; the scenario runs in BOTH existing lanes (`htmx2` and `htmx4`) with hard assertions in each (established dual-lane substitution).

## Acceptance evidence mapping

- "Bundar does not assume implicit inheritance in neutral components" — `diagnoseInheritance()` models explicit inheritance per dialect; `formatDisinherit()` provides explicit control.
- "The v2 adapter can preserve v2 behavior while the v4 adapter emits explicit configuration where approved" — `HTMX2_INHERITED_ATTRIBUTES` and `diagnoseInheritance` report v2 vs v4 differences.
- "Unsupported extension patterns produce migration diagnostics" — `diagnoseExtension("json-enc", htmx4Experimental)` returns `support: "unsupported"` and notes deprecation.
- "Compatibility extension use is optional and visible, never silently injected" — `HTMX_2_COMPAT_EXTENSION` is an explicit descriptor with migration warnings.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record, `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks

- Third-party extension compatibility is unverified (out of scope by design); `rawExtension()` marks them as unverified in diagnostics.

## Newly unblocked

- GH-078 (HTMX 2-to-4 audit and migration linter; depends on GH-046, GH-047, GH-070).
