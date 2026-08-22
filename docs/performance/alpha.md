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
