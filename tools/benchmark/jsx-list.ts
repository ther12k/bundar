/**
 * GH-029 jsx-list benchmark.
 *
 * Measures renderNode over a 10,000-item list (the planned `bench -- jsx-list`
 * contract; tooling decision: dedicated tool isolates the renderer, which the
 * end-to-end GH-007 harness cannot).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { jsx, jsxs, renderNode } from "../../packages/jsx/src/index";

const LIST_SIZE = 10_000;
const ITERATIONS = 200;

function buildList() {
  const items = Array.from({ length: LIST_SIZE }, (_, i) =>
    jsx("li", { class: i % 2 ? "odd" : "even", children: `item ${i}` }),
  );
  return jsxs("ul", { id: "list", children: items });
}

const tree = buildList();
// warmup
for (let i = 0; i < 10; i++) renderNode(tree);

const samples: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const started = performance.now();
  renderNode(tree);
  samples.push((performance.now() - started) * 1_000_000);
}
samples.sort((a, b) => a - b);

const report = {
  issue: "GH-029",
  scenario: "jsx-list",
  bunVersion: Bun.version,
  os: `${process.platform} ${process.arch}`,
  listSize: LIST_SIZE,
  iterations: ITERATIONS,
  p50Ns: Math.round(samples[Math.floor(samples.length * 0.5)]!),
  p95Ns: Math.round(samples[Math.floor(samples.length * 0.95)]!),
  meanNs: Math.round(
    samples.reduce((sum, value) => sum + value, 0) / samples.length,
  ),
};

console.log(
  `jsx-list(${LIST_SIZE}): p50=${report.p50Ns}ns p95=${report.p95Ns}ns mean=${report.meanNs}ns over ${ITERATIONS} iterations`,
);

const artifactDir = join(import.meta.dir, "../../evidence/gh-029");
await mkdir(artifactDir, { recursive: true });
await writeFile(
  join(artifactDir, "jsx-list-bench.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log("artifact: evidence/gh-029/jsx-list-bench.json");
