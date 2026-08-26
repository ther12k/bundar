# Beta performance report (BR-077)

> **These are measurements on ONE environment under ambient desktop load
> (~2.4–3.5), not universal claims.** Recorded by `bun run bench:release`
> at commit `20d26b9` (2026-08-26): Bun 1.4.0, Linux x86_64, 12 cores.
> Reproduce with `bun run bench:beta` on your hardware before drawing
> conclusions.

## Workloads

The alpha suite prices hello-world routing. These beta workloads price
what admin/dashboard applications actually do (`tools/benchmark/
beta-workloads.ts`, artifact `artifacts/bench/beta.json`):

- **Large escaped tables** — 100 / 1,000 / 10,000 rows through the JSX
  renderer, both buffered string and streaming; every timed output must
  be byte-equal between modes and keep hostile cell content escaped
  (`</td><script>` can never survive rendering).
- **Multi-region updates** — `composeFragment` with primary-only vs
  primary plus three out-of-band secondary updates (BR-052 API).
- **Forms** — URL-encoded submission validated through `validateForm`
  (valibot Standard Schema), a 100-field parse under explicitly raised
  per-call limits, and multipart parsing (8 text fields + 2 small
  files).

Correctness for every scenario is verified before any timing; budgets
live in `artifacts/bench/beta-budgets.json` (same-run stream/string
ratios plus MAD-widened absolute p50/TTFB budgets — fail-closed via
`bun run bench:beta --verify`, riding `bench:regression`). Production
body limits are untouched: the 100-field scenario raises `maxFields`/
`maxParts` through `parseForm`'s explicit argument and would fail at
the shipped defaults by design.

## Results (p50 / p99 µs; lower is better)

| Scenario | p50 | p95 | p99 |
| --- | ---: | ---: | ---: |
| table-string-100 | 136.8 | 230.3 | 400.6 |
| table-stream-100 (ttfb p50 6.1µs) | 1230.7 | 2026.5 | 2879.8 |
| table-string-1000 | 1312.2 | 3417.4 | 6537.7 |
| table-stream-1000 (ttfb p50 35.2µs) | 14322.6 | 16614.7 | 19635.0 |
| table-string-10000 | 18623.5 | 31855.5 | 35762.7 |
| table-stream-10000 (ttfb p50 36.4µs) | 151180.6 | 181184.9 | 215554.2 |
| fragment-only-update | 24.5 | 40.6 | 59.2 |
| primary-secondary-updates (3 OOB) | 34.8 | 59.7 | 95.5 |
| form-urlencoded-validate-20 | 54.0 | 159.0 | 1482.6 |
| form-urlencoded-parse-100 (raised limits) | 127.8 | 209.7 | 726.9 |
| multipart-parse-8f-2files | 47.0 | 96.9 | 670.3 |

Memory proxies around each measured block (advisory, from
`process.memoryUsage()` deltas): at 10k rows the string block grew RSS
+15.1 MiB while the streaming block was net −5.7 MiB — buffering keeps
the whole page resident, streaming does not.

## Reading

- **Time-to-first-byte is stream-shaped, not size-shaped.** Streams
  deliver their first bytes in 6–36 µs regardless of table size; the
  string render cannot answer before its entire tree is built
  (0.14 ms at 100 rows → 18.6 ms at 10k rows).
- **Total CPU is string-shaped.** Streaming pays per-chunk emission
  overhead (roughly 12–15 µs per row here): total consumption costs
  8–11× the equivalent string render at every size tested.

## Recommendation: string or stream by workload size

| Rows | Recommendation |
| --- | --- |
| ≤ ~100 | **String.** Streaming's total-cost penalty buys nothing — there is nothing to hide behind a first-byte win of microseconds. |
| ~1,000 | **String by default** (1–3 ms end-to-end is inside human indifference); choose stream when the client renders progressively or p95 wall-time headroom matters more than server CPU. |
| ≥ ~10,000 unpaginated | **Stream** — first visible content arrives ~500× earlier (36 µs vs 19 ms blank wait) with bounded memory; but paginate or window server-side *first*: paginated strings beat any single giant response in total CPU. |

No claims are made beyond this environment. The budget gate (not these
numbers) decides regressions going forward.

## Measured optimization opportunities

- Per-row chunk emission dominates streaming totals (~12–15 µs/row).
  Coalescing adjacent sync-rendered rows into larger chunks before
  flushing could plausibly cut streamed totals several-fold at zero
  semantic change. Measured impact justifies a tracked follow-up;
  complexity touches BR-072 streaming conformance, so it is registered
  as its own issue rather than folded into BR-077.
