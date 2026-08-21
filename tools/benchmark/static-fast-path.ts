/**
 * GH-016 static-response fast-path benchmark.
 *
 * Measures a Bundar-compiled static route table against a hand-written raw
 * Bun route table, both served by real `Bun.serve` instances over localhost.
 * The planned `bun run bench -- static-response` contract is honored via this
 * dedicated tool (documented tooling decision: the GH-007 harness is
 * in-process by design and cannot exercise Bun's native route dispatch, which
 * is exactly the path this issue must measure).
 *
 * Writes a machine-readable artifact to evidence/gh-016/static-response-bench.json.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { App } from "../../packages/core/src/index";

const WARMUP = 200;
const ITERATIONS = 5_000;

const staticResponse = () =>
  new Response("<p>static</p>", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const app = new App();
app.route("/static", ["GET"], staticResponse());

const bundarServer = Bun.serve({ ...app.compile(), port: 0 });
const rawServer = Bun.serve({
  port: 0,
  routes: { "/static": staticResponse() },
  fetch: () => new Response("Not Found", { status: 404 }),
});

async function measure(
  label: string,
  url: string,
): Promise<{
  label: string;
  p50Ns: number;
  p95Ns: number;
  meanNs: number;
  iterations: number;
}> {
  for (let i = 0; i < WARMUP; i++) await fetch(url);
  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const started = performance.now();
    const response = await fetch(url);
    await response.text();
    samples.push((performance.now() - started) * 1_000_000);
  }
  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length * 0.5)]!;
  const p95 = samples[Math.floor(samples.length * 0.95)]!;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  console.log(
    `${label}: p50=${p50.toFixed(0)}ns p95=${p95.toFixed(0)}ns mean=${mean.toFixed(0)}ns over ${ITERATIONS} iterations`,
  );
  return {
    label,
    p50Ns: Math.round(p50),
    p95Ns: Math.round(p95),
    meanNs: Math.round(mean),
    iterations: ITERATIONS,
  };
}

const raw = await measure(
  "raw-bun",
  `http://localhost:${rawServer.port}/static`,
);
const bundar = await measure(
  "bundar",
  `http://localhost:${bundarServer.port}/static`,
);

const overheadPercent = ((bundar.p50Ns - raw.p50Ns) / raw.p50Ns) * 100;

const report = {
  issue: "GH-016",
  scenario: "static-response",
  bunVersion: Bun.version,
  os: `${process.platform} ${process.arch}`,
  iterations: ITERATIONS,
  warmup: WARMUP,
  raw,
  bundar,
  bundarVsRawP50OverheadPercent: Number(overheadPercent.toFixed(2)),
  note: "Both servers are real Bun.serve instances over localhost; the Bundar table is compiled by compileRoutes with the same Response instance passed by reference.",
};

const artifactDir = join(import.meta.dir, "../../evidence/gh-016");
await mkdir(artifactDir, { recursive: true });
await writeFile(
  join(artifactDir, "static-response-bench.json"),
  JSON.stringify(report, null, 2) + "\n",
);

bundarServer.stop(true);
rawServer.stop(true);
console.log(`overhead (p50, bundar vs raw): ${overheadPercent.toFixed(2)}%`);
console.log(`artifact: evidence/gh-016/static-response-bench.json`);
