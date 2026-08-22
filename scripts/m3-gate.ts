/**
 * ci:m3 (GH-056): ordered, fail-closed M3 zero-handler-change dialect-switch
 * gate battery — a strict superset of ci:m2 adding: the dual-dialect browser
 * parity run, the source-diff dialect-conditional guard, the conformance
 * report publication, and the open-redirect/cache navigation security audits.
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
    "bench:report (m1 artifact)",
    ["run", "bench:report", "artifacts/bench/m1.json"],
  ],
  [
    "bench:report (m2 artifact)",
    ["run", "bench:report", "artifacts/bench/m2.json"],
  ],
  ["core contract matrix", ["run", "test:integration:core"]],
  ["core type consumer", ["run", "test:consumer:core"]],
  ["jsx type consumer", ["run", "test:consumer:jsx"]],
  ["schema type consumer", ["run", "test:consumer:schema"]],
  ["routes type consumer", ["run", "test:consumer:routes"]],
  ["routes:check", ["run", "routes:check"]],
  ["api:check", ["run", "api:check"]],
  ["pack:inspect @bundar/core", ["run", "pack:inspect", "@bundar/core"]],
  ["pack:inspect @bundar/jsx", ["run", "pack:inspect", "@bundar/jsx"]],
  ["pack:inspect @bundar/schema", ["run", "pack:inspect", "@bundar/schema"]],
  [
    "pack:inspect @bundar/security",
    ["run", "pack:inspect", "@bundar/security"],
  ],
  ["pack:inspect @bundar/htmx", ["run", "pack:inspect", "@bundar/htmx"]],
  ["security:raw-html-audit", ["run", "security:raw-html-audit"]],
  ["security:validation-redaction", ["run", "security:validation-redaction"]],
  ["security:jsx", ["run", "security:jsx"]],
  ["security:csrf", ["run", "security:csrf"]],
  ["security:cookies", ["run", "security:cookies"]],
  ["security:uploads", ["run", "security:uploads"]],
  ["security:cache", ["run", "security:cache"]],
  ["security:redirects", ["run", "security:redirects"]],
  ["htmx:source-diff", ["run", "htmx:source-diff"]],
  ["test:browser:htmx2", ["run", "test:browser:htmx2"]],
  ["test:browser:htmx4", ["run", "test:browser:htmx4"]],
  ["test:browser:report", ["run", "test:browser:report"]],
  ["test:browser:jsx", ["run", "test:browser:jsx"]],
  ["test:dual-app", ["run", "test:dual-app"]],
  ["conformance:report (htmx2)", ["run", "conformance:report", "htmx2"]],
  [
    "conformance:report (htmx4-beta6)",
    ["run", "conformance:report", "htmx4-beta6"],
  ],
  ["test", ["test"]],
  ["build", ["run", "build"]],
] as const;

function runStep(name: string, args: readonly string[]): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\n[m3] ${name}: bun ${args.join(" ")}`);
    const child = spawn("bun", args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", (error) => {
      console.error(`[m3] ${name}: failed to start: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      const exitCode = code ?? 1;
      if (signal !== null) {
        console.error(`[m3] ${name}: terminated by ${signal}`);
      }
      console.log(`[m3] ${name}: exit ${exitCode}`);
      resolve(exitCode);
    });
  });
}

for (const [name, args] of steps) {
  const exitCode = await runStep(name, args);
  if (exitCode !== 0) {
    console.error(`[m3] stopped after ${name} failed with exit ${exitCode}`);
    process.exit(exitCode);
  }
}

console.log(`\n[m3] all ${steps.length} required steps passed`);
