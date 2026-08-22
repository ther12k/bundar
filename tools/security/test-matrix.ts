/**
 * Unified security test suite (GH-068).
 *
 * Runs every security audit in sequence, fail-closed. Each audit is an
 * independent script that exits 0 on success. This runner aggregates them
 * into a single pass/fail for CI and produces a machine-readable report.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const steps = [
  ["security:raw-html-audit", ["run", "security:raw-html-audit"]],
  ["security:validation-redaction", ["run", "security:validation-redaction"]],
  ["security:jsx", ["run", "security:jsx"]],
  ["security:csrf", ["run", "security:csrf"]],
  ["security:cookies", ["run", "security:cookies"]],
  ["security:uploads", ["run", "security:uploads"]],
  ["security:cache", ["run", "security:cache"]],
  ["security:redirects", ["run", "security:redirects"]],
  ["security:headers", ["run", "security:headers"]],
] as const;

interface AuditResult {
  readonly name: string;
  readonly exitCode: number;
  readonly durationMs: number;
}

function runStep(name: string, args: readonly string[]): Promise<AuditResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn("bun", [...args] as string[], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "pipe",
    });
    child.once("exit", (code) => {
      resolve({
        name,
        exitCode: code ?? 1,
        durationMs: Date.now() - started,
      });
    });
    child.once("error", () => {
      resolve({ name, exitCode: 1, durationMs: Date.now() - started });
    });
  });
}

const results: AuditResult[] = [];
let failed = false;

for (const [name, args] of steps) {
  console.log(`[security] ${name}...`);
  const result = await runStep(name, args);
  results.push(result);
  if (result.exitCode !== 0) {
    console.error(`[security] ${name}: FAILED (exit ${result.exitCode})`);
    failed = true;
  } else {
    console.log(`[security] ${name}: ok (${result.durationMs}ms)`);
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.exitCode === 0).length,
  failed: results.filter((r) => r.exitCode !== 0).length,
  results: results.map((r) => ({
    name: r.name,
    exitCode: r.exitCode,
    durationMs: r.durationMs,
  })),
};

const outputDir = join(import.meta.dir, "..", "..", "artifacts", "security");
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  join(outputDir, "test-matrix.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

if (failed) {
  console.error(
    `[security] FAILED: ${report.failed}/${report.total} audits failed`,
  );
  process.exit(1);
}
console.log(
  `[security] ok: ${report.passed}/${report.total} audits passed (${results.reduce((sum, r) => sum + r.durationMs, 0)}ms total)`,
);
