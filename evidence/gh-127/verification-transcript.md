# GH-127 verification transcript — Carno.js benchmark reference (BR-076)

## Issue

[GH-127 / BR-076 — Add Carno.js as a fair backend-framework benchmark
reference](https://github.com/ther12k/bundar/issues/127) (branch
`gh-127-carno-benchmark`, worktree `bundar-gh-127`, base `c4272d7`).

## Environment

- Bun `1.4.0`; TypeScript `6.0.3`; Linux `7.0.0-28-generic` x86_64,
  12 cores (13th Gen Intel i5-13420H).
- Comparator pins: Hono `4.13.3`; **`@carno.js/core` `1.7.0`** (MIT,
  `reflect-metadata` `0.2.2`, zod `4.4.3` already pinned).
- Carno research: `npm view @carno.js/core` (40 stable versions, latest
  1.7.0); API studied from the installed package
  (`Carno`, `Controller/Get/Post/Param/Query/Body/Schema/ZodAdapter`,
  `CarnoMiddleware`, DI `Container`). Probes in a scratch project
  confirmed Bun 1.4.0 emits decorator metadata (constructor DI resolves),
  the compiled route table is pattern-keyed with pre-built `Response`
  instances on the static path, and `ctx.text`/`ctx.html` set
  charset-less content types — all documented as semantic differences.

## Planned-path deviations (issue spec → actual layout)

- The issue's suggested `benchmarks/adapters/carno.ts`,
  `benchmarks/scenarios/**`, `docs/performance/comparison.md` do not
  exist in this repository. The authoritative harness lives in
  `tools/benchmark/` (adapters.ts, scenarios.ts, runner.ts) and the
  recorded comparison doc is `docs/performance/alpha.md`; the new
  fixture follows that structure (`tools/benchmark/carno-app.ts` +
  `tools/benchmark/payloads.ts`) and `benchmarks/carno/README.md`
  documents the adapter. No other deviations.

## What changed

- `tools/benchmark/carno-app.ts` (new): real Carno fixture —
  `@Service` DI, class middlewares (registered in the container; a
  class middleware missing from `app.services()` throws
  `Provider not found`, found live in the probe), `@Schema`-validated
  JSON DTO. Boots via the public `listen(0)` → `stop()` lifecycle;
  dispatches in-process over the compiled Bun-native route table with
  `params` attachment for `/users/:id` and `cloneStatic` for any
  pre-built static `Response` entries (the Bundar adapter's exact
  convention). `routes` is private in 1.7.0 — pinned version, read
  validated by parity every run.
- `tools/benchmark/payloads.ts` (new): zero-import shared constants so
  adapter copies cannot drift and the carno startup probe measures no
  `@bundar` module weight.
- Scenarios: `validated-json` + `service-access` added; the two JSX
  scenarios carry `excluded: ["carno"]`.
- `types.ts` (AdapterName += carno, Partial parity map, carno startup
  mode), `adapters.ts` (carno adapter; `/json` + `/service` on raw/hono),
  `bundar-app.ts` (`/json` + `/service`; constants sourced from
  payloads), `runner.ts` (participation-aware parity/measure; carno
  startup probe), `startup-probe.ts` (carno mode), `regression.ts`
  (carno startup = context, never gated), `report.ts` (carno rows,
  exclusion markers), `release.ts` (carno fixture version in the
  environment manifest), `parity.ts` (message).
- Manifests: root `package.json` devDependencies `@carno.js/core`
  `1.7.0` (+ `reflect-metadata` `0.2.2`); `tsconfig.json`
  `experimentalDecorators` + `emitDecoratorMetadata` (tools-only usage;
  no other file uses decorators).
- Tests: `tests/benchmark/benchmark.test.ts` — participation model,
  JSX exclusion, carno pin + service-access snapshot, **optionality
  contract** (fails if any packages/*/examples/*/package.json ever
  lists `@carno.js/core`), results count 42, startup modes
  `[bundar, carno, raw-bun]`.
- Docs: `benchmarks/carno/README.md` (semantic differences),
  `benchmarks/README.md` (adapter + scenario rows + exclusion rule),
  `docs/performance/alpha.md` (BR-076 section recorded at `64cc79d`).
- Artifacts (force-added past `artifacts/bench*.json` ignore, matching
  the committed GH-083 set): `alpha.json` (42 measurements, 11 parity),
  `alpha-budgets.json` (15 budgets, 3 pooled runs), `environment.json`
  (now includes `carnoReferenceFixture: 1.7.0`), `raw-latest.json`.

## Commands and exit statuses

All run in the worktree on the implementation commit `64cc79d`:

- `bun install` (after adding devDeps) — ok.
- `bun run bench:parity` — "11 scenarios passed parity checks across
  all participating adapters (raw Bun, Hono, Bundar, Carno where
  applicable)".
- `bun run bench:smoke` — 11 scenarios, exit 0.
- `bun run bench -- --output artifacts/bench/carno-baseline.json` —
  42 measurements, 11 parity checks (scratch artifact, deleted after
  inspection).
- `bun test tests/benchmark/` — 8 pass / 0 fail (216 expects); re-run
  5× stable.
- `bunx tsc --noEmit -p tsconfig.json` — exit 0.
- `bun run lint`, `bunx prettier --check` (via format gates) — exit 0.
- `bun run architecture:check` — ok (104 source + 119 test files,
  9 package rules, 9 manifests).
- `bun test` (full suite) — 1105 pass / 0 fail; one cold-cache
  transient in the first worktree run did not reproduce in three
  consecutive full re-runs nor in the benchmark-file stress (5×).
- `bun run bench:regression -- --generate` — 15 budgets from 3 pooled
  runs (temp `alpha-generate-run*.json` deleted after generation,
  matching GH-083 practice).
- `bun run bench:release` — alpha.json + environment.json written,
  stamped at `64cc79d` (packed-candidate guard passed).
- `bun run bench:regression` — "within budget (15 measurements
  checked, 0 alert(s))".

### Budget regeneration note (disclosed)

The first budget/alpha pair tripped
`ratio:validated-form:bundar: 7.53× > fail 7.39×`. Investigation: this
branch does not touch the form path; the committed August alpha.json
recorded raw-bun at 6.25 µs on that scenario vs ~2.4 µs today (raw
side moved ~2.6×, Bundar side unchanged), so the same-run ratio
drifted on the raw side. Budgets and the release artifact were
regenerated as one consistent set (generate → release → regression:
pass, 0 alerts). No scenario, warmup, iteration, or tolerance was
weakened; `STATIC_TOLERANCE_RATIO` and all pre-existing budgets'
derivation formula are untouched.

## Acceptance criteria

- [x] All compared responses are semantically equivalent and verified
  before timing — parity asserts status/body/normalized content-type +
  vary for every participating adapter on every scenario before any
  timing (11 scenarios; exclusions are explicit, never fake
  equivalence).
- [x] Versions, setup, warmup, concurrency, hardware, OS, memory, and
  raw results are recorded — `artifacts/bench/environment.json`
  (Bun/platform/arch/kernel/cores/mem, package pins incl.
  `carnoReferenceFixture: 1.7.0`, dialect pins, recording commit
  `64cc79d`), methodology block (warmup 100, measured 1000, startup
  samples 7), and every raw sample in `alpha.json`.
- [x] The report does not claim superiority from incomparable feature
  sets — JSX rows print no Carno number and no winner label;
  `docs/performance/alpha.md` states the feature sets are not
  comparable and claims nothing beyond the shared
  routing/middleware/validation surface.
- [x] The adapter is optional and does not become a Bundar runtime
  dependency — root devDependencies only, enforced by an executable
  test across every package manifest.

## Residual risks

- The carno dispatch reads the private `routes` table (pinned 1.7.0);
  a future Carno upgrade must re-verify the probe assumptions (parity
  will fail loudly if the table shape changes).
- In-process dispatch excludes Bun.serve's C++ route matching for
  every adapter equally — pre-existing harness methodology, restated
  in the carno README.
- `validated-json` times the valid path only; framework error-shape
  differences are documented instead of parity-claimed.

## Newly unblocked

- BR-077 / #128 (beta budgets from large-table rendering and form
  parsing profiles) — dependency BR-076 satisfied.
