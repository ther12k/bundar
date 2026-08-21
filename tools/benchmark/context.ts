/**
 * GH-017 context-creation benchmark.
 *
 * Measures `createContext` allocation cost (dynamic-handler-only path) over
 * N iterations and records the artifact to evidence/gh-017/context-bench.json.
 * Tooling decision: the planned `bun run bench -- context` contract is honored
 * by this dedicated tool because the GH-007 harness measures end-to-end
 * adapters, while this issue needs the context-creation step isolated.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createContext } from "../../packages/core/src/index";

const ITERATIONS = 100_000;
const request = new Request("http://localhost/users/7?page=2&sort=asc", {
  headers: { cookie: "session=abc; theme=dark" },
});
const params = { id: "7" };

for (let i = 0; i < 10_000; i++) createContext(request, params);

const samples: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const started = performance.now();
  const context = createContext(request, params);
  context.query("page");
  context.cookie("theme");
  samples.push((performance.now() - started) * 1_000_000);
}
samples.sort((a, b) => a - b);

const report = {
  issue: "GH-017",
  scenario: "context-creation",
  bunVersion: Bun.version,
  os: `${process.platform} ${process.arch}`,
  iterations: ITERATIONS,
  p50Ns: Math.round(samples[Math.floor(samples.length * 0.5)]!),
  p95Ns: Math.round(samples[Math.floor(samples.length * 0.95)]!),
  meanNs: Math.round(
    samples.reduce((sum, value) => sum + value, 0) / samples.length,
  ),
  note: "Per-context cost including lazy query+cookie first access; static routes never allocate a context (GH-016).",
};

console.log(
  `context: p50=${report.p50Ns}ns p95=${report.p95Ns}ns mean=${report.meanNs}ns over ${ITERATIONS} iterations`,
);

const artifactDir = join(import.meta.dir, "../../evidence/gh-017");
await mkdir(artifactDir, { recursive: true });
await writeFile(
  join(artifactDir, "context-bench.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log("artifact: evidence/gh-017/context-bench.json");
