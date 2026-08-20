# GH-007 Verification Transcript

## Environment

- Bun `1.4.0`
- Hono `4.13.3` (pinned in `package.json` and `bun.lock`)
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Timing: in-process `Request`/`Response`; no localhost networking
- Raw report: `evidence/gh-007/bench.json`
- Summary: `evidence/gh-007/summary.json`

## Commands

```text
$ bun run bench:smoke
bench:smoke: 9 scenarios passed parity and response checks
  -> exit 0

$ bun run bench:parity
bench:parity: 9 scenarios passed raw Bun/Hono parity checks
  -> exit 0

$ bun run bench -- --warmup 10 --iterations 50 --output evidence/gh-007/bench.json
bench: wrote 18 measurements and 9 parity checks to evidence/gh-007/bench.json
  -> exit 0

$ bun run format:check
All matched files use Prettier code style!
  -> exit 0

$ bun run docs:validate
205? / 207 documents after GH-007 artifacts are excluded from corpus; local structural validation: OK
  -> exit 0

$ bun run docs:check
 docs:check: ok (7 governance files, 11 manifests verified)
  -> exit 0

$ bun run architecture:check
 architecture:check: ok (7 source files, 7 package rules enforced)
  -> exit 0

$ bun test
31 pass
0 fail
74 expect() calls
  -> exit 0

$ bun run build
all workspace skeleton packages exited with code 0
  -> exit 0

$ bun install --frozen-lockfile
  -> exit 0
```

## Harness behavior

Nine scenarios are declared: static response, dynamic text, parameterized
route, synchronous middleware, asynchronous middleware, escaped fragment,
async component, page/fragment negotiation, and validated form.

Each scenario runs parity checks before timing. The raw Bun and Hono responses
must match on status, body, and normalized content-type/vary semantics. The
normalization only accounts for known adapter serialization differences (`UTF-8`
case and Hono's absent text content type); raw snapshots remain in the report.

The Bundar adapter is deliberately explicit and returns `501` with
`deferred-until-m1`; no Bundar performance result is timed or claimed before
framework behavior exists. This avoids inventing an implementation or
silently treating a placeholder as a baseline.

Reports include every sample, count, min/max, mean, p50/p95/p99, standard
deviation, relative standard deviation, warmup/measured iteration counts,
parity-before-timing metadata, platform, architecture, Bun version, and
adapter versions.

## Artifact review

The 50-iteration report contains 18 measured distributions (9 scenarios × 2
implemented adapters), 900 timing samples total, and 9 parity snapshots. The
raw samples are preserved; `summary.json` is only a convenience projection.

The observed values are environment-specific baseline measurements. They do
not establish that Bundar is faster than raw Bun or Hono, and no regression
thresholds were configured. Thresholds wait for reviewed M0/M1 baselines as
required by `engineering/benchmarks.md`.

## Remaining risks

- The Bundar comparator remains deferred until M1/M2 implementation issues.
- This harness measures in-process handler work, not network/server startup or
  slow-client streaming; representative network workloads remain future gate
  work.
- CPU model/governor are unavailable through the portable Bun API in this
  runner and are recorded as unavailable rather than guessed.
