/**
 * GH-024 benchmark report: prints a per-scenario adapter comparison from a
 * benchmark JSON artifact, summarizes startup/RSS probes, and enforces the
 * reviewed static fast-path tolerance recorded in
 * docs/okf/delivery/gates/m1-performance.md. Exits non-zero when the gate
 * is violated. Ratios are informational only — no absolute "fastest"
 * claims are made from a single machine.
 */
import type { BenchmarkReport, BenchmarkResult } from "./types";

// Reviewed tolerance (m1-performance.md): the compiled static fast path is
// a table lookup returning the same Response object raw Bun would build by
// hand, so p50 must stay within this multiple of the raw-bun p50.
const STATIC_TOLERANCE_RATIO = 2.0;

const input = process.argv[2] ?? "artifacts/bench/m1.json";
const rawReport: Record<string, unknown> = JSON.parse(
  await Bun.file(input).text(),
);

// M2 JSX gate artifacts carry their own shape; dispatch before m1 logic.
if (rawReport.gate === "m2-jsx") {
  const m2 = rawReport as unknown as {
    environment: { bun: string; platform: string; arch: string };
    parity: Record<string, { equal: boolean }>;
    results: ReadonlyArray<{
      scenario: string;
      mode: string;
      distribution: {
        p50Ns: number;
        p95Ns: number;
        meanNs: number;
        relativeStandardDeviation: number;
      };
    }>;
    memoryProxies: {
      blocks: ReadonlyArray<{
        scenario: string;
        rssDeltaBytes: number;
        heapUsedBytes: number;
      }>;
    };
  };
  console.log(`bench:report: ${input} (m2-jsx gate)`);
  console.log(
    `  bun ${m2.environment.bun} · ${m2.environment.platform}/${m2.environment.arch} · parity ${Object.keys(m2.parity).length} scenarios (all pre-timing)`,
  );
  for (const result of m2.results) {
    const d = result.distribution;
    console.log(
      `  ${result.scenario.padEnd(22)} ${result.mode.padEnd(6)} p50 ${(d.p50Ns / 1_000).toFixed(1).padStart(8)}µs  p95 ${(d.p95Ns / 1_000).toFixed(1).padStart(8)}µs  mean ${(d.meanNs / 1_000).toFixed(1).padStart(8)}µs  rSD ${(d.relativeStandardDeviation * 100).toFixed(0)}%`,
    );
  }
  for (const block of m2.memoryProxies.blocks) {
    console.log(
      `  mem ${block.scenario.padEnd(22)} rssΔ ${(block.rssDeltaBytes / 1_048_576).toFixed(1)}MiB  heapΔ ${(block.heapUsedBytes / 1_048_576).toFixed(1)}MiB (advisory)`,
    );
  }
  if (!Object.values(m2.parity).every((entry) => entry.equal)) {
    console.error("bench:report: m2 parity pre-check data shows a failure");
    process.exit(1);
  }
  console.log(
    "bench:report: m2 gate recorded — parity held before timing and escaping markers were present in every timed output; budgets are documented in delivery/gates/m2-performance.md",
  );
  process.exit(0);
}

const report = rawReport as unknown as BenchmarkReport;

function microseconds(ns: number): string {
  return `${(ns / 1_000).toFixed(2)}µs`;
}

function byScenario(id: string): Map<string, BenchmarkResult> {
  const found = new Map<string, BenchmarkResult>();
  for (const result of report.results)
    if (result.scenario === id) found.set(result.adapter, result);
  return found;
}

console.log(`bench:report: ${input}`);
console.log(
  `  bun ${report.environment.bun} · ${report.environment.platform}/${report.environment.arch} · ${report.environment.cpuCount} CPUs · warmup ${report.methodology.warmupIterations} · measured ${report.methodology.measuredIterations} · parity ${report.parity.length} scenarios`,
);

for (const scenario of report.scenarios) {
  const results = byScenario(scenario.id);
  const raw = results.get("raw-bun");
  console.log(`  ${scenario.id} [${scenario.category}]`);
  for (const name of ["raw-bun", "hono", "bundar"] as const) {
    const result = results.get(name);
    if (result === undefined || raw === undefined) continue;
    const ratio = (result.distribution.p50Ns / raw.distribution.p50Ns).toFixed(
      2,
    );
    console.log(
      `    ${name.padEnd(7)} p50 ${microseconds(result.distribution.p50Ns).padStart(9)}  p95 ${microseconds(result.distribution.p95Ns).padStart(9)}  mean ${microseconds(result.distribution.meanNs).padStart(9)}  rSD ${(result.distribution.relativeStandardDeviation * 100).toFixed(1)}%  ×raw(p50) ${ratio}`,
    );
  }
}

console.log("  startup/RSS probes (fresh subprocess per sample)");
for (const startup of report.resources.startup) {
  console.log(
    `    ${startup.mode.padEnd(7)} ready min ${startup.readyMsMin.toFixed(1)}ms  p50 ${startup.readyMsP50.toFixed(1)}ms  rss min ${(startup.rssBytesMin / 1_048_576).toFixed(1)}MiB  p50 ${(startup.rssBytesP50 / 1_048_576).toFixed(1)}MiB  (${startup.samples} samples)`,
  );
}

const staticResults = byScenario("static-response");
const staticRaw = staticResults.get("raw-bun");
const staticBundar = staticResults.get("bundar");
if (staticRaw === undefined || staticBundar === undefined)
  throw new Error("bench:report: static-response results are missing");

const staticRatio =
  staticBundar.distribution.p50Ns / staticRaw.distribution.p50Ns;
if (staticRatio > STATIC_TOLERANCE_RATIO) {
  console.error(
    `bench:report: static fast path OUT OF TOLERANCE: ${staticRatio.toFixed(2)}× raw-bun p50 exceeds the reviewed ${STATIC_TOLERANCE_RATIO.toFixed(2)}× ceiling`,
  );
  process.exit(1);
}
console.log(
  `bench:report: static fast path within tolerance: ${staticRatio.toFixed(2)}× raw-bun p50 ≤ ${STATIC_TOLERANCE_RATIO.toFixed(2)}× reviewed ceiling`,
);
