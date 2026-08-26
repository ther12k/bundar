# Beta performance report (BR-077 / BR-098)

> **These are measurements on ONE environment under ambient desktop load
> (~2.4–3.5), not universal claims.** Recorded by `bun run bench:release`
> (2026-08-26): Bun 1.4.0, Linux x86_64, 12 cores.
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

## Results (p50 / p95 / p99 µs; lower is better)

| Scenario | p50 | p95 | p99 |
| --- | ---: | ---: | ---: |
| table-string-100 | 104.8 | 140.7 | 548.4 |
| table-stream-100 (ttfb p50 193.5µs) | 229.2 | 402.3 | 898.0 |
| table-string-1000 | 995.9 | 2120.6 | 2884.9 |
| table-stream-1000 (ttfb p50 203.9µs) | 2740.4 | 2935.8 | 3599.5 |
| table-string-10000 | 15899.1 | 22754.3 | 29167.1 |
| table-stream-10000 (ttfb p50 236.7µs) | 25648.0 | 27423.3 | 28922.5 |
| fragment-only-update | 22.8 | 30.1 | 43.0 |
| primary-secondary-updates (3 OOB) | 28.3 | 37.1 | 55.0 |
| form-urlencoded-validate-20 | 45.7 | 79.7 | 680.2 |
| form-urlencoded-parse-100 (raised limits) | 120.5 | 184.5 | 705.2 |
| multipart-parse-8f-2files | 46.6 | 100.7 | 628.0 |

Memory proxies around each measured block (advisory, from
`process.memoryUsage()` deltas): at 10k rows the string block grew RSS
+12.6 MiB while the streaming block was net +2.2 MiB — buffering keeps
the whole page resident, streaming does not.

## Reading

- **Time-to-first-byte is stream-shaped, not size-shaped.** Streams
  deliver early byte chunks in sub-millisecond ranges (190–240 µs p50)
  independent of table size, whereas large string renders cannot respond
  until the entire document is constructed (16 ms at 10k rows).
- **Chunk coalescing (BR-098 optimization):** Batching synchronous text
  fragments into 8 KiB chunks before controller enqueueing reduced
  10k-table stream consumption from ~151 ms down to ~25.6 ms (a ~6× speedup)
  and lowered the stream-over-string ratio from 8.12× down to ~1.6× while
  preserving byte-for-byte output equality and backpressure semantics.

## Recommendation: string or stream by workload size

| Rows | Recommendation |
| --- | --- |
| ≤ ~100 | **String.** Streaming's overhead buys little at this size — buffered string rendering is virtually instantaneous (~100 µs). |
| ~1,000 | **String by default** (~1 ms end-to-end); choose stream when the client renders progressively or early time-to-first-byte matters. |
| ≥ ~10,000 unpaginated | **Stream** — early chunks arrive in sub-millisecond ranges with bounded memory resident footprint; but paginate or window server-side *first*: paginated strings beat any single giant response in total CPU. |

No claims are made beyond this environment. The budget gate (not these
numbers) decides regressions going forward.
