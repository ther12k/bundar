import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const started = performance.now();
const result = spawnSync("bun", ["run", "typecheck"], {
  cwd: join(import.meta.dir, ".."),
  encoding: "utf8",
  stdio: "inherit",
});
const elapsedMs = performance.now() - started;
const budgetMs = 10_000;

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`typecheck:perf: ${elapsedMs.toFixed(0)}ms (budget ${budgetMs}ms)`);
if (elapsedMs > budgetMs) {
  console.error("typecheck:perf: budget exceeded");
  process.exit(1);
}
