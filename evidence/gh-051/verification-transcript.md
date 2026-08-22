# GH-051 verification transcript — version-neutral out-of-band and partial update intents

## Issue

[GH-051 — Implement version-neutral out-of-band and partial update intents](../../issues/m3/gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md)
(branch `gh-051-oob-intents`, worktree `bundar-gh-051`, base commit `c761daf` = main after the GH-064 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/htmx `0.0.0` (depends on @bundar/core, @bundar/jsx, @bundar/schema), pinned dialect profiles htmx `2.0.10` / `4.0.0-beta6` (never claimed GA).
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/htmx/src/updates.ts` (new):
  - `UpdateTarget` (`id`, optional `selector`), `UpdateOperation` (`replace-content`, `replace-element`, `append`, `prepend`, `remove`), and `UpdateIntent` (`target`, `operation`, `content`).
  - `serializeUpdates(intents, adapter)`: serializes update intents into OOB markup (`hx-swap-oob`) for the target dialect, preserving explicit destructive vs additive semantics (`true`, `outerHTML`, `beforeend`, `afterbegin`, `delete`). Validates intents (requires target ID, rejects duplicate target IDs, rejects missing content for additions/replacements, rejects content on remove). Prebuilt string content rides the explicit `raw()` boundary. Unsupported dialect capabilities fail closed with `UpdateIntentError`.
  - `auditUpdateMechanisms(serialized)`: returns compatibility diagnostic strings per target showing raw mechanism used and capability support level.
- Tests: `packages/htmx/test/updates/updates.test.ts` (9 tests) — identical intent source producing identical serialization across htmx 2 and htmx 4 beta, explicit swap operations mapping, prebuilt strings via raw boundary, duplicate target rejection, missing content / invalid remove diagnostics, capability gate for unsupported dialect, and mechanism audit report.
- Browser lanes: `/multi-region` POST endpoint in `tests/browser/server.ts`; real browser OOB multi-region scenario in `tests/browser/run.ts` hard-asserted in BOTH `htmx2` and `htmx4` lanes (replaces counter element to "42 items" and appends `<li>fresh row</li>` to list out-of-band).
- `packages/htmx/README.md`: OOB update intents section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/htmx/test/updates/**` (as `bun test ./packages/htmx/test/updates`) — exit 0; 9 tests, 23 expect() calls, 0 fail.
3. `bun run test:browser:htmx2` / `htmx4` — exit 0; the multi-region scenario passed in both lanes (`output/playwright/*/multi-region.json`).
4. `bun run test:browser:report` — exit 0.
5. `bun run --filter @bundar/htmx typecheck` and root `bun run typecheck` — exit 0.
6. `bun run lint`, `bun run format:check` — exit 0.
7. `bun test` (full) — exit 0; 590 tests across 71 files, 0 fail, 7,665 expect() calls.
8. `bun run architecture:check` — exit 0 (68 source files).
9. `bun run pack:inspect @bundar/htmx` — exit 0.
10. `bun run build` — exit 0.
11. `bun run docs:validate` (213 documents) / `docs:links` (1,119 links) — exit 0.

### Tooling decisions

- The planned `bun run test:browser:dual -- multi-region` runner does not exist; the scenario runs in BOTH existing lanes (`htmx2` and `htmx4`) with hard assertions in each (dual-lane substitution, established pattern).

## Acceptance evidence mapping

- "A counter and list row update uses identical application source in both lanes" — unit tests verify identical serialized output for htmx 2 and htmx 4 beta from the same `intents` data structure; browser fixture uses the same intent structure in both lanes.
- "Generated HTML is valid and target IDs/selectors are explicit" — tests assert each target ID and `hx-swap-oob` attribute; browser DOM verifies correct target replacement and append.
- "Adapter does not silently change destructive versus additive swap meaning" — `OOB_SWAP_BY_OPERATION` explicitly maps operations to distinct swap directives (`replace-content` -> `true`, `replace-element` -> `outerHTML`, `append` -> `beforeend`, `prepend` -> `afterbegin`, `remove` -> `delete`).
- "Raw dialect markup is reported by compatibility audit" — `auditUpdateMechanisms()` extracts per-target mechanism diagnostics.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — htmx README, closure record, `issues/m3/index.md`, `log.md`, this transcript.

## Residual risks

- The htmx 4 beta OOB mechanism is pinned according to `4.0.0-beta6`; any GA changes will be addressed in M7 (GH-089+).

## Newly unblocked

- GH-055 (dual-dialect reference fixture) and GH-063 (flash messages and OOB flash regions).
