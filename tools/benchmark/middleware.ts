/**
 * GH-018 middleware benchmarks (sync + async chains).
 *
 * Measures composeMiddleware dispatch cost against a bare terminal for
 * 0/1/5 sync middlewares and 1 async middleware. The planned
 * `bench -- middleware-sync` / `bench -- middleware-async` contracts are
 * honored by this dedicated tool (renderer/isolation rationale as GH-029).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { composeMiddleware } from "../../packages/core/src/middleware";
import { createContext } from "../../packages/core/src/context";
import type { Middleware } from "../../packages/core/src/middleware";

const ITERATIONS = 50_000;
const context = createContext(new Request("http://localhost/bench"), {});
const pass: Middleware = (_c, next) => next(context);

function bench(label: string, chain: readonly Middleware[]): number {
  const terminal = () => new Response("x");
  const composed = composeMiddleware(chain, terminal);
  for (let i = 0; i < 5_000; i++) composed(context);
  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const started = performance.now();
    composed(context);
    samples.push((performance.now() - started) * 1_000_000);
  }
  samples.sort((a, b) => a - b);
  const p50 = Math.round(samples[Math.floor(samples.length * 0.5)]!);
  console.log(`${label}: p50=${p50}ns over ${ITERATIONS} iterations`);
  return p50;
}

const results = {
  issue: "GH-018",
  scenario: "middleware-sync-async",
  bunVersion: Bun.version,
  os: `${process.platform} ${process.arch}`,
  iterations: ITERATIONS,
  bareP50Ns: bench("bare (no middleware)", []),
  sync1P50Ns: bench("sync x1", [pass]),
  sync5P50Ns: bench("sync x5", [pass, pass, pass, pass, pass]),
  async1P50Ns: ((): number => {
    const asyncPass: Middleware = async (_c, next) => next(context);
    const composed = composeMiddleware([asyncPass], () => new Response("x"));
    for (let i = 0; i < 10_000; i++) void composed(context);
    const started = performance.now();
    for (let i = 0; i < ITERATIONS; i++) void composed(context);
    const mean = ((performance.now() - started) * 1_000_000) / ITERATIONS;
    console.log(`async x1: mean≈${Math.round(mean)}ns (fire-and-forget)`);
    return Math.round(mean);
  })(),
  note: "Sync chains return plain Responses (no framework Promise); one async participant makes the chain Promise-returning by necessity.",
};

const artifactDir = join(import.meta.dir, "../../evidence/gh-018");
await mkdir(artifactDir, { recursive: true });
await writeFile(
  join(artifactDir, "middleware-bench.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log("artifact: evidence/gh-018/middleware-bench.json");
