/**
 * bench:regression (GH-083): fail-closed regression budgets derived from
 * observed variance — RATIO-based, because absolute timings drift with
 * machine load (a loaded machine slows raw Bun too; the Bundar/raw-Bun
 * ratio measured in the SAME run is the stable signal).
 *
 * - `--generate` pools three fresh runs: per scenario, the budget is the
 *   observed p50 RATIO (Bundar ÷ raw Bun, same run) widened by robust
 *   headroom (median + k·MAD of the ratio samples + safety factor).
 *   Startup ready-time and RSS use generous absolute budgets from the
 *   pooled distributions (they are noise-dominated; wide is honest).
 * - Default mode re-verifies parity from the archived snapshots, then
 *   compares artifacts/bench/alpha.json against the committed budgets:
 *   exit 1 on fail-level breach, list alerts, exit 0 within budget.
 *   Missing budgets fail closed — a new scenario is a risk, not a pass.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { semanticGuardFailures } from "./semantic-guard";

const REPO = join(import.meta.dir, "..", "..");
const ALPHA = join(REPO, "artifacts", "bench", "alpha.json");
const BUDGETS = join(REPO, "artifacts", "bench", "alpha-budgets.json");

interface Sample {
  readonly scenario: string;
  readonly adapter: string;
  readonly distribution: { readonly samplesNs: readonly number[] };
}

interface Startup {
  readonly mode: string;
  readonly readyMsP50: number;
  readonly rssBytesP50: number;
}

interface ParitySnapshot {
  status: number;
  body: string;
  headers: Record<string, string>;
}

interface BenchArtifact {
  results: Sample[];
  resources: { startup: Startup[] };
  parity: { scenario: string; adapters: Record<string, ParitySnapshot> }[];
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function mad(values: readonly number[], center: number): number {
  return median(values.map((value) => Math.abs(value - center)));
}

/** p50 ratio widened by robust dispersion of the ratio samples. */
function ratioBudget(ratios: readonly number[]): {
  p50: number;
  alert: number;
  fail: number;
} {
  const p50 = median(ratios);
  const spread = mad(ratios, p50);
  // microsecond-scale ratios jitter ±20% on a busy machine (the pinned
  // Hono fixture breaches tight budgets under pure load noise); these
  // factors keep a genuine 2× regression tripping while tolerating that
  return {
    p50,
    alert: p50 + 3 * spread + 0.3 * p50,
    fail: p50 + 6 * spread + 0.6 * p50,
  };
}

/** Generous absolute budget for noise-dominated metrics. */
function absoluteBudget(values: readonly number[]): {
  p50: number;
  alert: number;
  fail: number;
} {
  const p50 = median(values);
  const spread = mad(values, p50);
  return {
    p50,
    alert: p50 + 3 * spread + 0.5 * p50,
    fail: p50 + 6 * spread + 1.0 * p50,
  };
}

// parity, re-verified from the archived snapshots with the runner's own
// normalization — budgets never reward unsafe or disabled checks
const comparable = (snapshot: ParitySnapshot): string =>
  JSON.stringify({
    status: snapshot.status,
    body: snapshot.body,
    contentType: (() => {
      const value = (snapshot.headers["content-type"] ?? "").replace(
        /UTF-8/g,
        "utf-8",
      );
      if (value.length === 0 && !snapshot.body.startsWith("<")) {
        return "text/plain; charset=utf-8";
      }
      return value;
    })(),
    vary: snapshot.headers["vary"],
  });

function parityFailuresOf(artifact: BenchArtifact): string[] {
  return artifact.parity
    .filter((check) => {
      const reference = check.adapters["raw-bun"];
      if (reference === undefined) return true;
      return Object.entries(check.adapters).some(
        ([, snapshot]) => comparable(snapshot) !== comparable(reference),
      );
    })
    .map((check) => check.scenario);
}

if (!existsSync(ALPHA)) {
  console.error(
    "bench:regression: run bench:release first (alpha.json missing)",
  );
  process.exit(1);
}
const alpha = JSON.parse(readFileSync(ALPHA, "utf8")) as BenchArtifact;

const parityFailures = parityFailuresOf(alpha);
if (parityFailures.length > 0) {
  console.error(
    `bench:regression: parity failed for ${parityFailures.join(", ")} — budgets are void`,
  );
  process.exit(1);
}

const generate = process.argv.includes("--generate");

// BR-004 semantic guard: ratio budgets carry variance headroom, so a
// reintroduced per-request middleware composer can hide inside timing noise.
// This deterministic check fails closed before any budget comparison.
const guardFailures = semanticGuardFailures();
if (guardFailures.length > 0) {
  console.error("bench:regression: SEMANTIC GUARD FAILURES:");
  for (const failure of guardFailures) console.error(`  - ${failure}`);
  process.exit(1);
}

if (generate) {
  // pool per-run ratios from three fresh runs (same-run ratios cancel
  // machine load); startup/rss pool absolute values generously
  const ratios = new Map<string, number[]>();
  const startupSamples = new Map<string, number[]>();
  for (let index = 0; index < 3; index += 1) {
    const runPath = join(
      REPO,
      "artifacts",
      "bench",
      `alpha-generate-run${index}.json`,
    );
    const spawned = Bun.spawnSync(
      ["bun", "tools/benchmark/runner.ts", "--output", runPath],
      { cwd: REPO, stdout: "inherit", stderr: "inherit" },
    );
    if (spawned.exitCode !== 0) {
      console.error(`bench:regression: baseline run ${index} failed`);
      process.exit(1);
    }
    const artifact = JSON.parse(readFileSync(runPath, "utf8")) as BenchArtifact;
    if (parityFailuresOf(artifact).length > 0) {
      console.error(`bench:regression: baseline run ${index} failed parity`);
      process.exit(1);
    }
    const byScenario = new Map<string, Map<string, number>>();
    for (const result of artifact.results) {
      const p50 = median(result.distribution.samplesNs);
      byScenario.set(
        result.scenario,
        new Map([
          ...(byScenario.get(result.scenario) ?? []),
          [result.adapter, p50],
        ]),
      );
    }
    for (const [scenario, adapters] of byScenario) {
      const rawBun = adapters.get("raw-bun");
      for (const [adapter, p50] of adapters) {
        if (rawBun === undefined || rawBun === 0) continue;
        if (adapter !== "bundar") continue; // budget what we own; Hono is context
        const key = `ratio:${scenario}:${adapter}`;
        ratios.set(key, [...(ratios.get(key) ?? []), p50 / rawBun]);
      }
    }
    for (const startup of artifact.resources.startup) {
      for (const [suffix, value] of [
        ["readyMs", startup.readyMsP50],
        ["rssBytes", startup.rssBytesP50],
      ] as const) {
        const key = `startup:${startup.mode}:${suffix}`;
        startupSamples.set(key, [...(startupSamples.get(key) ?? []), value]);
      }
    }
  }

  const budgets: Record<string, Record<string, number>> = {};
  for (const [key, samples] of ratios) budgets[key] = ratioBudget(samples);
  for (const [key, samples] of startupSamples)
    budgets[key] = absoluteBudget(samples);
  writeFileSync(
    BUDGETS,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        runsPooled: 3,
        basis: "same-run ratio + generous absolute startup/rss",
        budgets,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `bench:regression: generated ${Object.keys(budgets).length} budgets from 3 pooled runs`,
  );
  process.exit(0);
}

if (!existsSync(BUDGETS)) {
  console.error(
    "bench:regression: no budgets committed — generate with --generate after a reviewed baseline run",
  );
  process.exit(1);
}
const { budgets } = JSON.parse(readFileSync(BUDGETS, "utf8")) as {
  budgets: Record<string, { alert: number; fail: number }>;
};

const breaches: string[] = [];
const alerts: string[] = [];
const seen = new Set<string>();

// same-run ratios from the artifact under test
const byScenario = new Map<string, Map<string, number>>();
for (const result of alpha.results) {
  const p50 = median(result.distribution.samplesNs);
  byScenario.set(
    result.scenario,
    new Map([
      ...(byScenario.get(result.scenario) ?? []),
      [result.adapter, p50],
    ]),
  );
}
for (const [scenario, adapters] of byScenario) {
  const rawBun = adapters.get("raw-bun");
  if (rawBun === undefined || rawBun === 0) continue;
  for (const [adapter, p50] of adapters) {
    if (adapter !== "bundar") continue; // gate only Bundar ratios
    const key = `ratio:${scenario}:${adapter}`;
    seen.add(key);
    const budget = budgets[key];
    if (budget === undefined) {
      breaches.push(`${key}: no budget (new scenario — regenerate budgets)`);
      continue;
    }
    const ratio = p50 / rawBun;
    if (ratio > budget.fail) {
      breaches.push(
        `${key}: ${ratio.toFixed(2)}× raw-bun > fail ${budget.fail.toFixed(2)}×`,
      );
    } else if (ratio > budget.alert) {
      alerts.push(
        `${key}: ${ratio.toFixed(2)}× raw-bun > alert ${budget.alert.toFixed(2)}×`,
      );
    }
  }
}
for (const startup of alpha.resources.startup) {
  for (const [suffix, value] of [
    ["readyMs", startup.readyMsP50],
    ["rssBytes", startup.rssBytesP50],
  ] as const) {
    const key = `startup:${startup.mode}:${suffix}`;
    seen.add(key);
    const budget = budgets[key];
    if (budget === undefined) {
      breaches.push(`${key}: no budget`);
      continue;
    }
    if (value > budget.fail)
      breaches.push(
        `${key}: ${value.toFixed(1)} > fail ${budget.fail.toFixed(1)}`,
      );
    else if (value > budget.alert)
      alerts.push(
        `${key}: ${value.toFixed(1)} > alert ${budget.alert.toFixed(1)}`,
      );
  }
}
for (const key of Object.keys(budgets)) {
  if (!seen.has(key))
    alerts.push(`${key}: budget has no current measurement (stale)`);
}

if (alerts.length > 0) {
  console.warn("bench:regression: ALERTS (review):");
  for (const alert of alerts) console.warn(`  - ${alert}`);
}
if (breaches.length > 0) {
  console.error("bench:regression: FAILURES:");
  for (const breach of breaches) console.error(`  - ${breach}`);
  process.exit(1);
}
console.log(
  `bench:regression: within budget (${seen.size} measurements checked, ${alerts.length} alert(s))`,
);
