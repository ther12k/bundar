import { spawn } from "node:child_process";

const steps = [
  ["preflight", ["run", "preflight"]],
  ["format:check", ["run", "format:check"]],
  ["lint", ["run", "lint"]],
  ["typecheck", ["run", "typecheck"]],
  ["docs:validate", ["run", "docs:validate"]],
  ["docs:links", ["run", "docs:links"]],
  ["issues:graph", ["run", "issues:graph"]],
  ["docs:check", ["run", "docs:check"]],
  ["architecture tests", ["test", "tests/architecture"]],
  ["architecture:check", ["run", "architecture:check"]],
  ["bench:smoke", ["run", "bench:smoke"]],
  ["bench:parity", ["run", "bench:parity"]],
  ["test:browser:htmx2", ["run", "test:browser:htmx2"]],
  ["test:browser:htmx4", ["run", "test:browser:htmx4"]],
  ["test:browser:report", ["run", "test:browser:report"]],
  ["test", ["test"]],
  ["build", ["run", "build"]],
] as const;

function runStep(name: string, args: readonly string[]): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\n[m0] ${name}: bun ${args.join(" ")}`);
    const child = spawn("bun", args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", (error) => {
      console.error(`[m0] ${name}: failed to start: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      const exitCode = code ?? 1;
      if (signal !== null) {
        console.error(`[m0] ${name}: terminated by ${signal}`);
      }
      console.log(`[m0] ${name}: exit ${exitCode}`);
      resolve(exitCode);
    });
  });
}

for (const [name, args] of steps) {
  const exitCode = await runStep(name, args);
  if (exitCode !== 0) {
    console.error(`[m0] stopped after ${name} failed with exit ${exitCode}`);
    process.exit(exitCode);
  }
}

console.log(`\n[m0] all ${steps.length} required steps passed`);
