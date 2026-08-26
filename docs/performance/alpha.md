# Alpha performance results (GH-083)

> **These are measurements on ONE environment, not universal claims.**
> Every number below was produced by `bun run bench:release` bound to
> the manifest in [`artifacts/bench/environment.json`](../artifacts/bench/environment.json)
> (Bun 1.4.0, Linux x86_64, 12 cores; htmx pins 2.0.10 stable /
> 4.0.0-beta6 experimental). Reproduce with the same command on your
> hardware before drawing conclusions.

## Methodology

In-process `Request`/`Response` timing (no localhost networking), 100
warmup + 1,000 measured iterations, 7 startup samples; **behavior
parity is checked before timing** — Bundar must answer byte-comparable
(status/body/normalized headers) responses to raw Bun and the pinned
Hono fixture (4.13.3) or the run fails. Regression budgets derive from
observed variance (median + k·MAD headroom; see
[`alpha-budgets.json`](../artifacts/bench/alpha-budgets.json)) —
`bun run bench:regression` fails closed, and missing budgets fail too.

Since BR-003/BR-004, `bench:regression` also runs a deterministic
semantic guard (`tools/benchmark/semantic-guard.ts`): middleware chains
must compose exactly once per compiled route during `app.compile()` and
never per request. Timing ratios alone cannot reliably catch a
reintroduced per-request composer (measured: ~1.30× observed versus a
2.41× fail threshold on the sync-middleware scenario), so the guard
fails closed on composition-count violations independent of machine
speed or load.

## Startup and memory (median of 7 samples)

| Mode | Ready p50 | RSS p50 |
| --- | ---: | ---: |
| raw Bun.serve | 5.3 ms | 15.7 MB |
| Bundar app | 16.1 ms | 29.1 MB |

Bundar composes middleware chains and the route table at compile time;
the measured cost is ~11 ms startup and ~13 MB RSS for the framework
surface on this environment.

## Scenario p50 (microseconds, lower is better)

| Scenario | raw Bun | Hono | Bundar |
| --- | ---: | ---: | ---: |
| static response | 1.5 | 4.0 | 1.2 |
| dynamic text | 1.8 | 2.4 | 2.4 |
| parameterized route | 1.5 | 2.0 | 1.7 |
| sync middleware | 1.3 | 1.2 | 1.8 |
| async middleware | 1.5 | 1.6 | 1.6 |
| escaped JSX fragment | 1.3 | 1.5 | 2.9 |
| async JSX component | 1.5 | 1.8 | 2.7 |
| page/fragment negotiation | 1.8 | 2.1 | 2.9 |
| validated form action | 2.4 | 6.8 | 8.4 |

Reading: Bundar tracks raw Bun within low single-digit microseconds on
routing/middleware paths and sits in Hono's range on rendering-heavy
paths. The validated-form row prices the full progressive pipeline
(bounded parse → Standard Schema validation → PRG/fragment composition)
— the same code that serves both browser modes; no per-request
shortcut exists that bypasses those checks.

## What we do NOT claim

- No requests-per-second leadership claim (per the issue: synthetic
  rps alone is not a result).
- No claim beyond this environment; the manifest is the context.
- No unsafe speedups: parity failures void budgets; every scenario
  runs the same escaping/negotiation the framework always applies.

## Reproduce

```bash
bun run bench:release          # suite + environment manifest
bun run bench:parity           # behavior parity alone
bun run bench:regression       # budget gate (fail-closed)
```

## Carno.js reference (BR-076, recorded 2026-08-26 at `64cc79d`)

Carno.js (`@carno.js/core` `1.7.0`, MIT) is the enterprise-model
comparator: NestJS-style controllers, constructor DI, zod-backed body
validation, compiled to Bun-native routes. The fixture boots through
Carno's public lifecycle (`listen(0)` → `stop()`) and dispatches
in-process over the compiled route table — the same methodology as
every other adapter. `@carno.js/core` is pinned as a **root dev
dependency only** (asserted by `tests/benchmark/benchmark.test.ts`); it
is never a Bundar runtime dependency.

Two scenarios were added with this reference: `validated-json` (each
framework's own validation machinery; valid path only, byte-equal
responses) and `service-access` (module closure vs DI-injected
singleton). Scenario p50 (µs) from the same recorded run:

| Scenario | raw Bun | Hono | Bundar | Carno |
| --- | ---: | ---: | ---: | ---: |
| static response | 1.59 | 2.71 | 1.21 | 1.59 |
| dynamic text | 1.82 | 1.57 | 2.42 | 1.95 |
| parameterized route | 1.56 | 1.84 | 1.80 | 1.66 |
| sync middleware | 1.36 | 1.15 | 1.71 | 2.24 |
| async middleware | 1.52 | 1.67 | 1.73 | 2.17 |
| escaped JSX fragment | 1.35 | 1.46 | 2.93 | — |
| async JSX component | 1.59 | 1.73 | 2.66 | — |
| page/fragment negotiation | 1.81 | 2.06 | 2.85 | 1.94 |
| validated form | 2.44 | 5.08 | 11.27 | 3.64 |
| validated JSON | 2.06 | 2.31 | 2.10 | 4.07 |
| service access | 1.44 | 1.47 | 1.58 | 1.49 |

Startup/RSS (median of 7 fresh subprocesses): raw Bun 2.5 ms / 15.7 MiB;
Bundar 21.5 ms / 30.9 MiB; Carno 43.3 ms / 42.2 MiB — Carno's bootstrap
constructs the DI container and JIT-compiles controllers (plus
`reflect-metadata` and zod module weight), while its per-request
service access is a property read on a controller resolved once.

Reading rules for this comparison:

- The two JSX rendering scenarios print **no Carno number** — a string
  concatenation is not equivalent work to Bundar's escaping render
  model, so the pairing is excluded rather than faked (marked `—`).
  No winner label is derived from those rows for any adapter.
- Carno's handlers construct `Response` objects explicitly because its
  implicit normalization (string → pre-built `text/plain` static
  Response, object → JSON) cannot produce the byte-exact content types
  the parity contract requires. Its pre-built static fast path is
  therefore not exercised by the static-response row.
- `validated-json` times each framework's idiomatic validation:
  Carno runs class-level zod validation (its built-in machinery); the
  other adapters run inline field checks. Validation-failure shapes are
  framework-opinionated (Carno normalizes to JSON) and are excluded
  from parity by design.
- Feature sets are not comparable — Carno ships DI, lifecycle hooks,
  queues/schedules infrastructure and an ORM; Bundar ships the
  HTML/HTMX application model. These numbers price the shared
  routing/middleware/validation surface only and claim nothing about
  the rest. Regenerate with `bun run bench:regression -- --generate &&
  bun run bench:release` on your hardware before drawing conclusions.
