/**
 * ci:m1 (GH-025): ordered, fail-closed M1 HTTP-core gate battery. Every
 * step must exit 0; the first failure stops the gate. Covers the M0
 * battery plus the M1-specific gates: the core contract matrix, external
 * consumers, the routes snapshot, the API snapshot, package inspections,
 * the raw-HTML security audit, and the committed M1 performance artifact.
 */
import { spawn } from "node:child_process";

const steps = [
  ["preflight", ["run", "preflight"]],
  ["format:check", ["run", "format:check"]],
  ["lint", ["run", "lint"]],
  ["typecheck", ["run", "typecheck"]],
  ["test:types", ["run", "test:types"]],
  ["docs:validate", ["run", "docs:validate"]],
  ["docs:links", ["run", "docs:links"]],
  ["issues:graph", ["run", "issues:graph"]],
  ["docs:check", ["run", "docs:check"]],
  ["architecture tests", ["test", "tests/architecture"]],
  ["architecture:check", ["run", "architecture:check"]],
  ["bench:smoke", ["run", "bench:smoke"]],
  ["bench:parity", ["run", "bench:parity"]],
  [
    "bench:report (committed m1 artifact)",
    ["run", "bench:report", "artifacts/bench/m1.json"],
  ],
  ["core contract matrix", ["run", "test:integration:core"]],
  ["core type consumer", ["run", "test:consumer:core"]],
  ["jsx type consumer", ["run", "test:consumer:jsx"]],
  ["routes type consumer", ["run", "test:consumer:routes"]],
  ["routes:check", ["run", "routes:check"]],
  ["api:check", ["run", "api:check"]],
  ["pack:inspect @bundar/core", ["run", "pack:inspect", "@bundar/core"]],
  ["pack:inspect @bundar/jsx", ["run", "pack:inspect", "@bundar/jsx"]],
  ["security:raw-html-audit", ["run", "security:raw-html-audit"]],
  ["test:browser:htmx2", ["run", "test:browser:htmx2"]],
  ["test:browser:htmx4", ["run", "test:browser:htmx4"]],
  ["test:browser:report", ["run", "test:browser:report"]],
  ["test", ["test"]],
  ["build", ["run", "build"]],
] as const;

function runStep(name: string, args: readonly string[]): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\n[m1] ${name}: bun ${args.join(" ")}`);
    const child = spawn("bun", args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", (error) => {
      console.error(`[m1] ${name}: failed to start: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      const exitCode = code ?? 1;
      if (signal !== null) {
        console.error(`[m1] ${name}: terminated by ${signal}`);
      }
      console.log(`[m1] ${name}: exit ${exitCode}`);
      resolve(exitCode);
    });
  });
}

for (const [name, args] of steps) {
  const exitCode = await runStep(name, args);
  if (exitCode !== 0) {
    console.error(`[m1] stopped after ${name} failed with exit ${exitCode}`);
    process.exit(exitCode);
  }
}

console.log(`\n[m1] all ${steps.length} required steps passed`);
