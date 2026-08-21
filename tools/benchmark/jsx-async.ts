/**
 * GH-030 jsx sync/async benchmarks.
 * Planned `bench -- jsx-sync` / `bench -- jsx-async` contracts (dedicated
 * tool; isolation rationale as previous benchmark issues).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  jsx,
  jsxs,
  renderNode,
  renderNodeAsync,
  renderNodeAuto,
} from "../../packages/jsx/src/index";

function buildTree() {
  const items = Array.from({ length: 1_000 }, (_, i) =>
    jsx("li", { class: i % 2 ? "odd" : "even", children: `item ${i}` }),
  );
  return jsxs("ul", { id: "bench", children: items });
}

function measure(
  label: string,
  iterations: number,
  run: () => unknown,
): number {
  for (let i = 0; i < 5; i++) void run();
  const started = performance.now();
  for (let i = 0; i < iterations; i++) void run();
  const mean = ((performance.now() - started) * 1_000_000) / iterations;
  console.log(`${label}: mean≈${Math.round(mean)}ns over ${iterations}`);
  return Math.round(mean);
}

const tree = buildTree();

const report = {
  issue: "GH-030",
  scenario: "jsx-sync-async",
  bunVersion: Bun.version,
  os: `${process.platform} ${process.arch}`,
  syncRendererMeanNs: measure("sync renderNode (1000 items)", 200, () =>
    renderNode(tree),
  ),
  autoSyncPathMeanNs: measure(
    "renderNodeAuto sync path (no Promise)",
    200,
    () => {
      const result = renderNodeAuto(tree);
      void result;
    },
  ),
  asyncRendererMeanNs: await (async () => {
    for (let i = 0; i < 5; i++) await renderNodeAsync(tree);
    const started = performance.now();
    for (let i = 0; i < 100; i++) await renderNodeAsync(tree);
    const mean = ((performance.now() - started) * 1_000_000) / 100;
    console.log(
      `async renderNodeAsync (1000 items): mean≈${Math.round(mean)}ns over 100`,
    );
    return Math.round(mean);
  })(),
  note: "Sync trees stay on renderNodeAuto's synchronous string path; async adds per-node await bookkeeping by necessity.",
};

const artifactDir = join(import.meta.dir, "../../evidence/gh-030");
await mkdir(artifactDir, { recursive: true });
await writeFile(
  join(artifactDir, "jsx-async-bench.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log("artifact: evidence/gh-030/jsx-async-bench.json");
