# Benchmark harness (GH-007)

The harness compares equivalent in-process Request/Response workloads across:

- `raw-bun`: direct Web API handlers representing Bun's native ceiling.
- `hono`: Hono `4.13.3` on Bun, pinned in the root lockfile.
- `bundar`: explicit deferred adapter returning `501` until Bundar runtime
  behavior exists in M1/M2. No Bundar performance claim is made in M0.

## Scenarios

| ID | Category | Behavior |
|---|---|---|
| `static-response` | micro | Static HTML `Response` |
| `dynamic-text` | micro | Dynamic text from query data |
| `parameterized-route` | micro | One path parameter |
| `sync-middleware` | micro | Synchronous middleware step |
| `async-middleware` | micro | Asynchronous middleware step |
| `escaped-jsx-fragment` | micro | Escaped HTML fragment |
| `async-jsx-component` | micro | Asynchronous component-like render |
| `page-fragment-negotiation` | representative | Full page vs fragment based on `HX-Request` |
| `validated-form` | representative | URL-encoded form parse and validation |

Parity is checked between raw Bun and Hono before timing. The comparison
asserts status, body, and normalized content-type/vary semantics. Raw response
snapshots are stored in the parity section of each report.

## Commands

```bash
bun run bench:smoke
bun run bench:parity
bun run bench -- --warmup 100 --iterations 1000 --output artifacts/bench.json
```

Timing is in-process; these commands do not open localhost listeners. The
report includes every sample, warmup/repetition counts, percentiles, standard
deviation, relative standard deviation, Bun/platform metadata, and the exact
adapter versions. Generated artifacts are ignored by Git and belong in issue
or release evidence directories when a gate records them.

Performance budgets in `engineering/benchmarks.md` are hypotheses only. This
harness does not mark a framework faster, does not set regression thresholds,
and does not hide failed parity or timing runs.
