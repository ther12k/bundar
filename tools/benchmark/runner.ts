import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { adapters, invoke } from "./adapters";
import { scenarios } from "./scenarios";
import type {
  Adapter,
  BenchmarkReport,
  BenchmarkResources,
  BenchmarkScenario,
  Distribution,
  ParityResult,
  ResponseSnapshot,
  StartupDistribution,
} from "./types";

const DEFAULT_WARMUP = 100;
const DEFAULT_ITERATIONS = 1_000;
const DEFAULT_STARTUP_SAMPLES = 7;

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function numberArgument(name: string, fallback: number): number {
  const value = Number(argument(name, String(fallback)));
  if (!Number.isInteger(value) || value < 1) return fallback;
  return value;
}

function comparable(snapshot: ResponseSnapshot): ResponseSnapshot {
  const headers: Record<string, string> = {};
  for (const key of ["content-type", "vary"]) {
    const value = snapshot.headers[key];
    if (value !== undefined) {
      headers[key] =
        key === "content-type" ? value.replace(/UTF-8/g, "utf-8") : value;
    }
  }
  if (headers["content-type"] === undefined && !snapshot.body.startsWith("<")) {
    headers["content-type"] = "text/plain; charset=utf-8";
  }
  return { status: snapshot.status, headers, body: snapshot.body };
}

function assertParity(
  scenario: BenchmarkScenario,
  raw: ResponseSnapshot,
  other: ResponseSnapshot,
  otherName: string,
): void {
  const expected = JSON.stringify(comparable(raw));
  const actual = JSON.stringify(comparable(other));
  if (expected !== actual) {
    throw new Error(
      `parity failure for ${scenario.id} (${otherName}): raw-bun=${expected}, ${otherName}=${actual}`,
    );
  }
}

export function percentile(
  sorted: readonly number[],
  fraction: number,
): number {
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * fraction) - 1,
  );
  return sorted[index] ?? 0;
}

export function distribution(samplesNs: number[]): Distribution {
  const sorted = [...samplesNs].sort((a, b) => a - b);
  const count = sorted.length;
  const meanNs = sorted.reduce((sum, value) => sum + value, 0) / count;
  const variance =
    sorted.reduce((sum, value) => sum + (value - meanNs) ** 2, 0) / count;
  const standardDeviationNs = Math.sqrt(variance);
  return {
    samplesNs,
    count,
    minNs: sorted[0] ?? 0,
    maxNs: sorted[count - 1] ?? 0,
    meanNs,
    p50Ns: percentile(sorted, 0.5),
    p95Ns: percentile(sorted, 0.95),
    p99Ns: percentile(sorted, 0.99),
    standardDeviationNs,
    relativeStandardDeviation: meanNs === 0 ? 0 : standardDeviationNs / meanNs,
  };
}

export async function parityCheck(): Promise<readonly ParityResult[]> {
  const raw = adapters.find((adapter) => adapter.name === "raw-bun");
  const hono = adapters.find((adapter) => adapter.name === "hono");
  const bundar = adapters.find((adapter) => adapter.name === "bundar");
  if (raw === undefined || hono === undefined || bundar === undefined)
    throw new Error("raw-bun, hono, and bundar adapters are required");

  const results: ParityResult[] = [];
  for (const scenario of scenarios) {
    const rawSnapshot = await invoke(raw, scenario);
    const honoSnapshot = await invoke(hono, scenario);
    const bundarSnapshot = await invoke(bundar, scenario);
    assertParity(scenario, rawSnapshot, honoSnapshot, "hono");
    assertParity(scenario, rawSnapshot, bundarSnapshot, "bundar");
    results.push({
      scenario: scenario.id,
      adapters: {
        "raw-bun": rawSnapshot,
        hono: honoSnapshot,
        bundar: bundarSnapshot,
      },
    });
  }
  return results;
}

async function measure(
  adapter: Adapter,
  scenario: BenchmarkScenario,
  warmupIterations: number,
  measuredIterations: number,
): Promise<Distribution> {
  for (let index = 0; index < warmupIterations; index += 1) {
    const response = await adapter.request(scenario.request(), scenario);
    await response.arrayBuffer();
  }

  const samplesNs: number[] = [];
  for (let index = 0; index < measuredIterations; index += 1) {
    const start = Bun.nanoseconds();
    const response = await adapter.request(scenario.request(), scenario);
    await response.arrayBuffer();
    samplesNs.push(Bun.nanoseconds() - start);
  }
  return distribution(samplesNs);
}

type ProbeSample = { mode: string; readyMs: number; rssBytes: number };

async function probeOnce(mode: "raw" | "bundar"): Promise<ProbeSample> {
  const proc = Bun.spawn({
    cmd: [process.execPath, join(import.meta.dir, "startup-probe.ts"), mode],
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0)
    throw new Error(`startup probe (${mode}) exited with ${exitCode}`);
  const parsed = JSON.parse(stdout.trim()) as ProbeSample;
  if (parsed.mode !== mode || typeof parsed.readyMs !== "number")
    throw new Error(`startup probe (${mode}) returned malformed output`);
  return parsed;
}

async function measureStartup(
  samples: number,
): Promise<readonly StartupDistribution[]> {
  const distributions: StartupDistribution[] = [];
  for (const mode of ["raw", "bundar"] as const) {
    const readyMs: number[] = [];
    const rssBytes: number[] = [];
    for (let index = 0; index < samples; index += 1) {
      const sample = await probeOnce(mode);
      readyMs.push(sample.readyMs);
      rssBytes.push(sample.rssBytes);
    }
    readyMs.sort((a, b) => a - b);
    rssBytes.sort((a, b) => a - b);
    const median = (values: readonly number[]): number =>
      values[Math.floor(values.length / 2)] ?? 0;
    distributions.push({
      mode: mode === "raw" ? "raw-bun" : "bundar",
      samples,
      readyMsMin: readyMs[0] ?? 0,
      readyMsP50: median(readyMs),
      rssBytesMin: rssBytes[0] ?? 0,
      rssBytesP50: median(rssBytes),
    });
  }
  return distributions;
}

export async function runBenchmark(): Promise<BenchmarkReport> {
  const warmupIterations = numberArgument("--warmup", DEFAULT_WARMUP);
  const measuredIterations = numberArgument("--iterations", DEFAULT_ITERATIONS);
  const startupSamples = numberArgument(
    "--startup-samples",
    DEFAULT_STARTUP_SAMPLES,
  );
  const parity = await parityCheck();
  const results = [];

  for (const scenario of scenarios) {
    for (const adapter of adapters) {
      results.push({
        scenario: scenario.id,
        category: scenario.category,
        adapter: adapter.name,
        adapterVersion: adapter.version,
        distribution: await measure(
          adapter,
          scenario,
          warmupIterations,
          measuredIterations,
        ),
      });
    }
  }

  const resources: BenchmarkResources = {
    startup: await measureStartup(startupSamples),
    note: "startup probes run in fresh Bun subprocesses; readyMs is performance.now() read at app-ready, i.e. process-boot → app-ready — raw: hand-rolled 9-route switch handler with no framework; bundar: App registration + compileRoutes + middleware composition; rss is process.memoryUsage.rss() after the build",
  };

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    methodology: {
      timing: "in-process Request/Response; no localhost networking",
      warmupIterations,
      measuredIterations,
      parityCheckedBeforeTiming: true,
      rawSamplesIncluded: true,
    },
    environment: {
      bun: Bun.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: navigator.hardwareConcurrency ?? 1,
      cpuModel: "unavailable from portable Bun API",
    },
    scenarios,
    parity,
    results,
    resources,
  };
}

export async function main(): Promise<void> {
  const report = await runBenchmark();
  const output = resolve(argument("--output", "artifacts/bench.json"));
  await mkdir(dirname(output), { recursive: true });
  await Bun.write(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `bench: wrote ${report.results.length} measurements and ${report.parity.length} parity checks to ${output}`,
  );
}

if (import.meta.main) await main();
