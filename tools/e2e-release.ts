/**
 * test:e2e:release (GH-082): the complete dual-dialect end-to-end matrix —
 * every reference surface × {htmx2 stable, htmx4 experimental, no-JS},
 * the real-browser lanes (normal/boosted/history/forms/errors/OOB),
 * the security matrix, the scaffold/template journeys, and the shared
 * source guard — orchestrated fail-closed into
 * artifacts/conformance/release-matrix.json with per-suite timings and
 * an explicit experimental-lane deviation classification.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..");

interface SuiteResult {
  readonly suite: string;
  readonly lane: string;
  readonly status: "pass" | "fail";
  readonly ms: number;
  readonly detail: string;
}

const results: SuiteResult[] = [];

function suite(name: string, lane: string, script: readonly string[]): void {
  const started = Date.now();
  console.log(`\n[matrix] ${name} [${lane}]: bun ${script.join(" ")}`);
  const result = spawnSync("bun", [...script], {
    cwd: REPO,
    stdio: "inherit",
    env: process.env,
  });
  const ms = Date.now() - started;
  const status: "pass" | "fail" = result.status === 0 ? "pass" : "fail";
  results.push({
    suite: name,
    lane,
    status,
    ms,
    detail: `exit ${result.status ?? "signal"}`,
  });
  if (status === "fail") {
    console.error(`[matrix] FAILED: ${name} [${lane}]`);
    finish(1);
  }
}

/** Experimental-lane deviations, classified — never counted as stable. */
function deviations(): readonly unknown[] {
  try {
    const report = JSON.parse(
      readFileSync(
        join(REPO, "artifacts", "conformance", "htmx4-beta6.json"),
        "utf8",
      ),
    ) as {
      profile?: {
        capabilities?: {
          migrationDifferences?: unknown[];
          unsupported?: unknown[];
        };
      };
    };
    const capabilities = report.profile?.capabilities ?? {};
    return [
      ...(capabilities.migrationDifferences ?? []),
      ...(capabilities.unsupported ?? []).map((topic) => ({
        topic,
        difference: "unsupported in the beta profile",
        status: "explicit unsupported record",
      })),
    ];
  } catch {
    return [];
  }
}

function finish(exitCode: number): never {
  const artifact = {
    generated: new Date().toISOString(),
    pinned: {
      htmx2: "2.0.10 (stable)",
      htmx4: "4.0.0-beta6 (experimental — no GA claim)",
    },
    suites: results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
    },
    experimentalDeviations: deviations(),
  };
  mkdirSync(join(REPO, "artifacts", "conformance"), { recursive: true });
  writeFileSync(
    join(REPO, "artifacts", "conformance", "release-matrix.json"),
    JSON.stringify(artifact, null, 2) + "\n",
  );
  console.log(
    `\n[matrix] ${artifact.summary.passed}/${artifact.summary.total} suites passed` +
      (artifact.experimentalDeviations.length > 0
        ? `; ${artifact.experimentalDeviations.length} experimental deviation(s) classified`
        : ""),
  );
  process.exit(exitCode);
}

// ---- reference applications × three lanes (clean-install journeys) ----
suite("template/minimal", "htmx2", [
  "run",
  "test:template",
  "--",
  "minimal-htmx2",
]);
suite("template/minimal", "htmx4", [
  "run",
  "test:template",
  "--",
  "minimal-htmx4",
]);
suite("examples/todo", "htmx2", ["run", "test:example", "--", "todo:htmx2"]);
suite("examples/todo", "htmx4", ["run", "test:example", "--", "todo:htmx4"]);
suite("examples/todo", "no-js", ["run", "test:example", "--", "todo:no-js"]);
suite("examples/admin-crud", "htmx2", [
  "run",
  "test:example",
  "--",
  "admin:htmx2",
]);
suite("examples/admin-crud", "htmx4", [
  "run",
  "test:example",
  "--",
  "admin:htmx4",
]);
suite("examples/admin-crud", "no-js", [
  "run",
  "test:example",
  "--",
  "admin:no-js",
]);
suite("examples/workflow-gate", "all", ["test", "tests/workflow"]);
suite("scaffold", "htmx2", ["run", "test:scaffold", "--", "htmx2"]);
suite("scaffold", "htmx4", [
  "run",
  "test:scaffold",
  "--",
  "htmx4-experimental",
]);

// ---- real browsers: normal/boosted/history/forms/errors/OOB/upload ----
suite("browser-lanes", "htmx2", ["run", "test:browser:htmx2"]);
suite("browser-lanes", "htmx4", ["run", "test:browser:htmx4"]);
suite("browser-lanes", "dual-parity", ["run", "test:dual-app"]);

// ---- security posture + shared-source guard + accessibility smoke ----
suite("security", "matrix", ["run", "test:security"]);
suite("security", "workflow", ["run", "test:reference-workflow"]);
suite("security", "example-admin", ["run", "security:example-admin"]);
suite("shared-source", "guard", ["run", "htmx:source-diff"]);
suite("accessibility", "smoke", ["test", "tests/e2e"]);

finish(0);
