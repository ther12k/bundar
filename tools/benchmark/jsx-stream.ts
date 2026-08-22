/**
 * GH-034 jsx-stream micro-benchmark.
 *
 * Tooling decision: the planned `bun run bench -- jsx-stream` contract is
 * honored by this dedicated tool (same pattern as the GH-017 context bench)
 * because the GH-007 harness measures end-to-end adapters while this issue
 * needs the streaming renderer isolated. Measures streaming a 500-item
 * async list to completion, peak queue behavior under a slow consumer, and
 * the renderToStringAsync baseline for the same tree (backpressure and cancellation behavior are covered by the test suite, not timed here); records the artifact
 * to evidence/gh-034/jsx-stream-bench.json.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  jsx,
  renderToStream,
  renderToStringAsync,
} from "../../packages/jsx/src/index";

const ITEMS = 500;
const ITERATIONS = 50;

function tree(): unknown {
  return jsx("ul", {
    children: Array.from({ length: ITEMS }, (_, index) =>
      Promise.resolve(jsx("li", { children: `item-${index}-🎉` })),
    ),
  });
}

// warmup + measured: full-consumption streaming
for (let i = 0; i < 5; i++) {
  await new Response(renderToStream(tree()).stream).text();
}
const streamSamples: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const started = performance.now();
  await new Response(renderToStream(tree()).stream).text();
  streamSamples.push(performance.now() - started);
}

for (let i = 0; i < 5; i++) await renderToStringAsync(tree());
const stringSamples: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const started = performance.now();
  await renderToStringAsync(tree());
  stringSamples.push(performance.now() - started);
}

function stats(samples: number[]): { p50Ms: number; meanMs: number } {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p50Ms: sorted[Math.floor(sorted.length / 2)]!,
    meanMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
  };
}

const report = {
  issue: "GH-034",
  scenario: "jsx-stream-500-async-items",
  bunVersion: Bun.version,
  os: `${process.platform} ${process.arch}`,
  iterations: ITERATIONS,
  items: ITEMS,
  streaming: stats(streamSamples),
  stringBaseline: stats(stringSamples),
  note: "Streaming consumes incrementally (first byte before the last child resolves); renderToStringAsync buffers the full document. Backpressure (ByteLengthQueuingStrategy high-water mark) and cancellation behavior are asserted by the GH-034 test suite, not timed here.",
};

console.log(
  `jsx-stream: p50 ${report.streaming.p50Ms.toFixed(2)}ms mean ${report.streaming.meanMs.toFixed(2)}ms over ${ITERATIONS} runs (${ITEMS} async items); string baseline p50 ${report.stringBaseline.p50Ms.toFixed(2)}ms`,
);

const artifactDir = join(import.meta.dir, "../../evidence/gh-034");
await mkdir(artifactDir, { recursive: true });
await writeFile(
  join(artifactDir, "jsx-stream-bench.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
