/**
 * ci:release (GH-088): the complete release-candidate workflow from the
 * release commit — every mandatory M0–M6 gate, fail-closed, in order:
 * the ci:m4 battery (40 steps through M4), then the M5/M6 additions:
 * reference-app lanes, template + scaffold journeys, guides, doc
 * generation drift, performance budgets, package audit, SBOM/provenance/
 * reproducibility, publication dry run, and the release-notes checks.
 */
import { spawn } from "node:child_process";

const steps = [
  ["ci:m4 (M0–M4 battery)", ["run", "ci:m4"]],
  ["docs:generate (drift-free)", ["run", "docs:generate"]],
  ["docs:snippets", ["run", "docs:snippets"]],
  ["test:guides", ["run", "test:guides"]],
  ["test:template (htmx2)", ["run", "test:template", "--", "minimal-htmx2"]],
  ["test:template (htmx4)", ["run", "test:template", "--", "minimal-htmx4"]],
  ["test:example (todo:no-js)", ["run", "test:example", "--", "todo:no-js"]],
  ["test:example (todo:htmx2)", ["run", "test:example", "--", "todo:htmx2"]],
  ["test:example (todo:htmx4)", ["run", "test:example", "--", "todo:htmx4"]],
  ["test:example (admin:no-js)", ["run", "test:example", "--", "admin:no-js"]],
  ["test:example (admin:htmx2)", ["run", "test:example", "--", "admin:htmx2"]],
  ["test:example (admin:htmx4)", ["run", "test:example", "--", "admin:htmx4"]],
  ["test:scaffold (htmx2)", ["run", "test:scaffold", "--", "htmx2"]],
  [
    "test:scaffold (htmx4)",
    ["run", "test:scaffold", "--", "htmx4-experimental"],
  ],
  ["test:a11y (reference apps)", ["run", "test:a11y"]],
  ["test:no-js (reference apps)", ["run", "test:no-js"]],
  ["test:e2e:release (dual-dialect matrix)", ["run", "test:e2e:release"]],
  ["test:dx-cleanroom", ["run", "test:dx-cleanroom"]],
  ["bench:release (packed-candidate guard + suite)", ["run", "bench:release"]],
  ["bench:regression (budget gate)", ["run", "bench:regression"]],
  ["pack:audit (contents/licenses/sizes)", ["run", "pack:audit"]],
  ["release:sbom", ["run", "release:sbom"]],
  ["release:provenance", ["run", "release:provenance"]],
  ["release:reproduce", ["run", "release:reproduce"]],
  ["publish:dry-run (42 checks)", ["run", "publish:dry-run"]],
  ["release:notes-check", ["run", "release:notes-check"]],
  [
    "release:verify (artifact integrity & release preconditions)",
    ["run", "release:verify"],
  ],
] as const;

function runStep(name: string, args: readonly string[]): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\n[release] ${name}: bun ${args.join(" ")}`);
    const child = spawn("bun", [...args] as string[], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", (error) => {
      console.error(`[release] ${name}: failed to start: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      const exitCode = code ?? 1;
      if (signal !== null)
        console.error(`[release] ${name}: terminated by ${signal}`);
      console.log(`[release] ${name}: exit ${exitCode}`);
      resolve(exitCode);
    });
  });
}

for (const [name, args] of steps) {
  const exitCode = await runStep(name, args);
  if (exitCode !== 0) {
    console.error(
      `[release] stopped after ${name} failed with exit ${exitCode}`,
    );
    process.exit(exitCode);
  }
}

console.log(`\n[release] all ${steps.length} release-candidate steps passed`);
