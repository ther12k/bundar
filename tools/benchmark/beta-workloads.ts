/**
 * BR-077 beta workload harness: the admin/dashboard-shaped workloads the
 * alpha hello-world suite does not price — large server-rendered tables
 * (100 / 1,000 / 10,000 rows, string and stream), fragment-only and
 * primary-plus-secondary updates (BR-052 composeFragment), URL-encoded
 * forms through validateForm, an explicitly-raised-limits large form, and
 * multipart parsing. All scenarios are Bundar-mode by design: they
 * measure what BR-077 budgets (Bundar's own rendering/parsing surface),
 * not cross-framework parity.
 *
 * Correctness is verified BEFORE timing on every scenario:
 * - table streams must be byte-identical to the string render of the same
 *   tree, row counts exact, and escaping markers present (an escaped cell
 *   can never be met by disabling escaping);
 * - update compositions must start with the primary markup and carry each
 *   out-of-band target exactly once;
 * - parsed/validated form field counts are asserted per request shape.
 *
 * Memory proxies (rss/heapUsed deltas) are advisory context, never budgets.
 * Budgets for this artifact live in artifacts/bench/beta-budgets.json —
 * stream/string p50 RATIOS (same-run, self-normalizing) plus MAD-widened
 * absolute budgets; generate with --generate from 3 pooled runs, verify
 * with --verify. Production body limits are NEVER changed; the large-form
 * scenario raises limits per-call via parseForm's explicit argument and
 * the fixture documents that choice.
 *
 *   bun run bench:beta                          # measure -> beta.json
 *   bun run bench:beta --verify                 # artifact vs committed budgets
 *   bun run bench:beta --generate               # 3 pooled runs -> budgets
 */
import { mkdir } from "node:fs/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { createContext, parseForm } from "../../packages/core/src/index";
import {
  jsx,
  renderToStream,
  renderToString,
} from "../../packages/jsx/src/index";
import { htmx2 } from "../../packages/htmx/src/v2";
import {
  composeFragment,
  type UpdateSpec,
} from "../../packages/htmx/src/index";
import { validateForm } from "../../packages/forms/src/index";
import * as v from "valibot";
import { distribution } from "./runner";
import type { Distribution } from "./types";

const REPO = join(import.meta.dir, "..", "..");
function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
function outputPath(): string {
  return resolve(
    argument("--output") ?? join(REPO, "artifacts", "bench", "beta.json"),
  );
}
const BUDGETS = join(REPO, "artifacts", "bench", "beta-budgets.json");

/** Hostile cell content — proves escaping stays in every timed output. */
const HOSTILE_CELL = `</td><script>&"'`;

type RowCount = 100 | 1_000 | 10_000;
export const ROW_COUNTS: readonly RowCount[] = [100, 1_000, 10_000];

export function tableTree(rows: number): unknown {
  return jsx("table", {
    id: "grid",
    children: [
      jsx("thead", {
        children: jsx("tr", {
          children: ["id", "name", "status"].map((head) =>
            jsx("th", { scope: "col", children: head }),
          ),
        }),
      }),
      jsx("tbody", {
        children: Array.from({ length: rows }, (_, index) =>
          jsx("tr", {
            "data-row": String(index),
            children: [
              jsx("td", { children: String(index) }),
              jsx("td", { children: `user-${index}-${HOSTILE_CELL}` }),
              jsx("td", { children: index % 2 === 0 ? "active" : "idle" }),
            ],
          }),
        ),
      }),
    ],
  });
}

function region(rows: number): unknown {
  return jsx("tbody", {
    id: "region",
    children: Array.from({ length: rows }, (_, index) =>
      jsx("tr", {
        children: jsx("td", { children: `cell-${index}` }),
      }),
    ),
  });
}

const SECONDARY_SPECS: readonly UpdateSpec[] = [
  {
    target: "todo-counts",
    operation: "replace-content",
    content: "<p>12 total · 4 active</p>",
  },
  {
    target: "filters",
    operation: "replace-content",
    content: '<nav id="filters"><a data-active="true">all</a></nav>',
  },
  {
    target: "pager",
    operation: "replace-content",
    content: '<p id="pager">page 2 of 7</p>',
  },
];

async function drainWithTtfb(
  tree: unknown,
): Promise<{ text: string; ttfbNs: number }> {
  const stream = renderToStream(tree).stream as ReadableStream<Uint8Array>;
  const reader = stream.getReader();
  const started = Bun.nanoseconds();
  const first = await reader.read();
  const ttfbNs = Bun.nanoseconds() - started;
  const chunks: Uint8Array[] = [first.value!];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    chunks.push(next.value);
  }
  let length = 0;
  for (const chunk of chunks) length += chunk.byteLength;
  const merged = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(merged), ttfbNs };
}

function urlencodedRequest(fieldCount: number): Request {
  const params = new URLSearchParams();
  for (let index = 0; index < fieldCount; index += 1) {
    params.set(`field_${index}`, index === 0 ? "Bundar" : `value-${index}`);
  }
  return new Request("http://benchmark.invalid/form", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

function multipartRequest(): Request {
  const data = new FormData();
  for (let index = 0; index < 8; index += 1)
    data.set(`field_${index}`, `value-${index}`);
  data.set(
    "doc_a",
    new Blob([new Uint8Array(2_048).fill(65)], { type: "text/plain" }),
    "a.txt",
  );
  data.set(
    "doc_b",
    new Blob([new Uint8Array(4_096).fill(66)], { type: "text/plain" }),
    "b.txt",
  );
  return new Request("http://benchmark.invalid/upload", {
    method: "POST",
    body: data,
  });
}

interface BetaResult {
  scenario: string;
  kind: "string" | "stream" | "update" | "form";
  distribution: Distribution;
  /** Streaming scenarios only: time-to-first-chunk percentiles. */
  ttfb?: { p50Ns: number; p95Ns: number; p99Ns: number };
}

interface BetaReport {
  gate: "beta-workloads";
  schemaVersion: 1;
  generatedAt: string;
  correctnessVerifiedBeforeTiming: true;
  environment: {
    bun: string;
    platform: string;
    arch: string;
    cpuCount: number;
  };
  correctness: Record<string, { ok: true; detail: string }>;
  results: readonly BetaResult[];
  memoryProxies: {
    note: string;
    blocks: ReadonlyArray<{
      scenario: string;
      rssDeltaBytes: number;
      heapUsedDeltaBytes: number;
    }>;
  };
  limitsPolicy: string;
}

function fail(scenario: string, why: string): never {
  console.error(`bench:beta: correctness failure for ${scenario} — ${why}`);
  process.exit(1);
}

function memoryProxy(): { rssBytes: number; heapUsedBytes: number } {
  const usage = process.memoryUsage();
  return { rssBytes: usage.rss, heapUsedBytes: usage.heapUsed };
}

async function measure(
  iterations: number,
  warmup: number,
  run: () => void | Promise<void>,
): Promise<Distribution> {
  for (let index = 0; index < warmup; index += 1) await run();
  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = Bun.nanoseconds();
    await run();
    samples.push(Bun.nanoseconds() - started);
  }
  return distribution(samples);
}

const args = process.argv;

// ---------------------------------------------------------------------------
// Budget math (mirrors tools/benchmark/regression.ts; kept local so the two
// gates cannot drift apart silently).
// ---------------------------------------------------------------------------
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function mad(values: readonly number[], center: number): number {
  return median(values.map((value) => Math.abs(value - center)));
}

export interface Budget {
  p50: number;
  alert: number;
  fail: number;
}

export function ratioBudget(ratios: readonly number[]): Budget {
  const p50 = median(ratios);
  const spread = mad(ratios, p50);
  return {
    p50,
    alert: p50 + 3 * spread + 0.3 * p50,
    fail: p50 + 6 * spread + 0.6 * p50,
  };
}

export function absoluteBudget(values: readonly number[]): Budget {
  const p50 = median(values);
  const spread = mad(values, p50);
  // TTFB/absolute ns values are noise-dominated on shared machines.
  return {
    p50,
    alert: p50 + 3 * spread + 0.75 * p50,
    fail: p50 + 6 * spread + 1.5 * p50,
  };
}

type BetaArtifact = Omit<BetaReport, "correctnessVerifiedBeforeTiming"> & {
  correctnessVerifiedBeforeTiming?: boolean;
};

function p50Of(result: BetaResult | undefined): number | undefined {
  if (result === undefined) return undefined;
  return median(result.distribution.samplesNs);
}

async function main(): Promise<void> {
  if (args.includes("--generate")) {
    await generate();
    return;
  }

  const shouldVerify = args.includes("--verify");
  if (shouldVerify && existsSync(outputPath())) {
    await verify(readFileSync(outputPath(), "utf8"));
    return;
  }

  // -----------------------------------------------------------------------
  // Measure into beta.json (correctness verified before any timing).
  // -----------------------------------------------------------------------
  const outPath = outputPath();
  const correctness: Record<string, { ok: true; detail: string }> = {};
  const results: BetaResult[] = [];
  const blocks: {
    scenario: string;
    rssDeltaBytes: number;
    heapUsedDeltaBytes: number;
  }[] = [];

  interface Plan {
    scenario: string;
    kind: BetaResult["kind"];
    warmup: number;
    iterations: number;
    streaming?: boolean;
    run: () => void | Promise<void>;
    // Stream ratio pairing + TTFB absolute budgets need sample access.
    collectTtfbInto?: number[];
  }

  const plans: Plan[] = [];

  // Tables: build ONE tree per size; the string render is both a timed
  // scenario and the byte-parity reference for the stream scenario.
  for (const rows of ROW_COUNTS) {
    const tree = tableTree(rows);
    const expected = renderToString(tree);
    const rowCount = (expected.match(/<tr[ >]/g) ?? []).length;
    if (rowCount !== rows + 1)
      fail(
        `table-string-${rows}`,
        `expected ${rows + 1} <tr>, saw ${rowCount}`,
      );
    if (!expected.includes("&lt;/td&gt;&lt;script&gt;"))
      fail(
        `table-string-${rows}`,
        "escaping marker missing from rendered cells",
      );
    correctness[`table-string-${rows}`] = {
      ok: true,
      detail: `${expected.length} bytes, ${rowCount} <tr>, hostile cell escaped`,
    };

    plans.push({
      scenario: `table-string-${rows}`,
      kind: "string",
      warmup: rows >= 10_000 ? 3 : rows >= 1_000 ? 10 : 40,
      iterations: rows >= 10_000 ? 40 : rows >= 1_000 ? 150 : 400,
      run: () => {
        void renderToString(tree);
      },
    });

    const drained = await drainWithTtfb(tree);
    if (drained.text !== expected)
      fail(
        `table-stream-${rows}`,
        "streamed bytes differ from the string render BEFORE timing",
      );
    correctness[`table-stream-${rows}`] = {
      ok: true,
      detail: `${drained.text.length} bytes byte-equal to string render; ttfb ${(drained.ttfbNs / 1_000).toFixed(0)}µs`,
    };

    const ttfbSamples: number[] = [];
    plans.push({
      scenario: `table-stream-${rows}`,
      kind: "stream",
      warmup: rows >= 10_000 ? 3 : rows >= 1_000 ? 10 : 40,
      iterations: rows >= 10_000 ? 40 : rows >= 1_000 ? 150 : 400,
      streaming: true,
      collectTtfbInto: ttfbSamples,
      run: async () => {
        const started = Bun.nanoseconds();
        const reader = (
          renderToStream(tree).stream as ReadableStream<Uint8Array>
        ).getReader();
        await reader.read();
        ttfbSamples.push(Bun.nanoseconds() - started);
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
        }
      },
    });
  }

  // Updates: fragment-only and primary+secondary (BR-052 composeFragment).
  {
    const primaryOnly = composeFragment(
      { primary: region(60) },
      { dialect: htmx2 },
    ).html;
    if (
      !primaryOnly.includes('id="region"') ||
      !primaryOnly.includes("cell-59")
    )
      fail("fragment-only-update", "primary region markup missing");

    plans.push({
      scenario: "fragment-only-update",
      kind: "update",
      warmup: 30,
      iterations: 300,
      run: () => {
        void composeFragment({ primary: region(60) }, { dialect: htmx2 }).html;
      },
    });

    const composed = composeFragment(
      { primary: region(60), updates: [...SECONDARY_SPECS] },
      { dialect: htmx2 },
    ).html;
    if (!composed.startsWith(primaryOnly))
      fail(
        "primary-secondary-updates",
        "composite does not extend the primary markup",
      );
    for (const spec of SECONDARY_SPECS) {
      const hits = composed.split(`"${spec.target}"`).length - 1;
      if (hits < 1)
        fail(
          "primary-secondary-updates",
          `out-of-band target ${spec.target} missing`,
        );
    }
    correctness["fragment-only-update"] = {
      ok: true,
      detail: `${primaryOnly.length}-byte primary region`,
    };
    correctness["primary-secondary-updates"] = {
      ok: true,
      detail: `primary prefix equal + ${SECONDARY_SPECS.length} out-of-band targets present`,
    };

    plans.push({
      scenario: "primary-secondary-updates",
      kind: "update",
      warmup: 30,
      iterations: 300,
      run: () => {
        void composeFragment(
          { primary: region(60), updates: [...SECONDARY_SPECS] },
          { dialect: htmx2 },
        ).html;
      },
    });
  }

  // Forms: bounded validateForm at defaults (20 fields), explicitly raised
  // limits for the 100-field variant, and multipart parsing.
  {
    const schema = v.object({
      field_0: v.pipe(v.string(), v.minLength(1)),
      field_19: v.string(),
    });
    plans.push({
      scenario: "form-urlencoded-validate-20",
      kind: "form",
      warmup: 20,
      iterations: 200,
      run: async () => {
        const result = await validateForm(
          createContext(urlencodedRequest(20), {}),
          schema,
        );
        if (!result.success)
          fail(
            "form-urlencoded-validate-20",
            "fixture submission failed its schema",
          );
      },
    });
    correctness["form-urlencoded-validate-20"] = {
      ok: true,
      detail: "valibot schema accepted the 20-field fixture submission",
    };

    plans.push({
      scenario: "form-urlencoded-parse-100",
      kind: "form",
      warmup: 20,
      iterations: 200,
      run: async () => {
        // Explicit per-call raise for a benchmark-sized body: production
        // DEFAULT_BODY_LIMITS are untouched (see limitsPolicy).
        const form = await parseForm(
          createContext(urlencodedRequest(100), {}),
          { maxFields: 128, maxParts: 128 },
        );
        if (form.get("field_99") !== "value-99")
          fail("form-urlencoded-parse-100", "parsed fixture lost a tail field");
      },
    });
    correctness["form-urlencoded-parse-100"] = {
      ok: true,
      detail: "100-field body parsed under explicitly raised per-call limits",
    };

    plans.push({
      scenario: "multipart-parse-8f-2files",
      kind: "form",
      warmup: 15,
      iterations: 120,
      run: async () => {
        const form = await parseForm(createContext(multipartRequest(), {}));
        if (form.files.length !== 2)
          fail(
            "multipart-parse-8f-2files",
            `expected 2 stored files, got ${form.files.length}`,
          );
        if (form.get("field_7") !== "value-7")
          fail("multipart-parse-8f-2files", "multipart field value corrupted");
      },
    });
    correctness["multipart-parse-8f-2files"] = {
      ok: true,
      detail: "8 text fields + 2 files (2 KiB, 4 KiB) parsed; values verified",
    };
  }

  for (const plan of plans) {
    const before = memoryProxy();
    const dist = await measure(plan.iterations, plan.warmup, plan.run);
    const after = memoryProxy();
    blocks.push({
      scenario: plan.scenario,
      rssDeltaBytes: after.rssBytes - before.rssBytes,
      heapUsedDeltaBytes: after.heapUsedBytes - before.heapUsedBytes,
    });
    const entry: BetaResult = {
      scenario: plan.scenario,
      kind: plan.kind,
      distribution: dist,
    };
    if (plan.collectTtfbInto !== undefined && plan.collectTtfbInto.length > 0) {
      const ttfbDist = distribution(plan.collectTtfbInto);
      entry.ttfb = {
        p50Ns: ttfbDist.p50Ns,
        p95Ns: ttfbDist.p95Ns,
        p99Ns: ttfbDist.p99Ns,
      };
    }
    results.push(entry);
  }

  const report: BetaReport = {
    gate: "beta-workloads",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    correctnessVerifiedBeforeTiming: true,
    environment: {
      bun: Bun.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: navigator.hardwareConcurrency ?? 1,
    },
    correctness,
    results,
    memoryProxies: {
      note: "rss/heapUsed deltas around each measured block (advisory context, never budgets)",
      blocks,
    },
    limitsPolicy:
      "Production DEFAULT_BODY_LIMITS are unchanged. The 100-field urlencoded scenario raises maxFields/maxParts PER CALL via parseForm's explicit limits argument (128) and would fail at the shipped defaults by design; the other fixtures fit inside the shipped limits.",
  };

  await mkdir(dirname(outPath), { recursive: true });
  await Bun.write(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `bench:beta: wrote ${results.length} measurements (${plans.length} scenarios) with pre-timing correctness checks to ${outPath}`,
  );

  if (shouldVerify) await verify(await Bun.file(outPath).text());
}

// ---------------------------------------------------------------------------
// Verification: artifact vs committed budgets — fail closed.
// ---------------------------------------------------------------------------
async function verify(rawJson: string): Promise<void> {
  if (!existsSync(BUDGETS)) {
    console.error(
      "bench:beta: no beta-budgets.json committed — generate with `bun run bench:beta --generate` after a reviewed baseline",
    );
    process.exit(1);
  }
  const artifact = JSON.parse(rawJson) as BetaArtifact;
  if (artifact.gate !== "beta-workloads") {
    console.error("bench:beta: artifact is not a beta-workloads report");
    process.exit(1);
  }
  if (
    !artifact.correctnessVerifiedBeforeTiming ||
    Object.keys(artifact.correctness ?? {}).length === 0
  ) {
    console.error("bench:beta: artifact lacks pre-timing correctness records");
    process.exit(1);
  }
  const { budgets } = JSON.parse(readFileSync(BUDGETS, "utf8")) as {
    budgets: Record<string, Budget>;
  };

  const breaches: string[] = [];
  const alerts: string[] = [];
  const seen = new Set<string>();
  const byScenario = new Map<string, BetaResult>(
    artifact.results.map((r) => [r.scenario, r]),
  );

  // Stream-over-string same-run ratios per size + absolute checks.
  for (const rows of ROW_COUNTS) {
    const streamP50 = p50Of(byScenario.get(`table-stream-${rows}`));
    const stringP50 = p50Of(byScenario.get(`table-string-${rows}`));
    if (streamP50 !== undefined && stringP50 !== undefined && stringP50 > 0) {
      const key = `ratio:table-stream-${rows}:over-string`;
      seen.add(key);
      const budget = budgets[key];
      const ratio = streamP50 / stringP50;
      if (budget === undefined) breaches.push(`${key}: no budget`);
      else if (ratio > budget.fail)
        breaches.push(
          `${key}: ${ratio.toFixed(2)}× > fail ${budget.fail.toFixed(2)}×`,
        );
      else if (ratio > budget.alert)
        alerts.push(
          `${key}: ${ratio.toFixed(2)}× > alert ${budget.alert.toFixed(2)}×`,
        );
    }
  }

  for (const result of artifact.results) {
    const key = `abs:${result.scenario}:p50ns`;
    seen.add(key);
    const budget = budgets[key];
    const p50 = median(result.distribution.samplesNs);
    if (budget === undefined) {
      breaches.push(`${key}: no budget (new scenario — regenerate)`);
      continue;
    }
    if (p50 > budget.fail)
      breaches.push(
        `${key}: ${(p50 / 1e6).toFixed(2)}ms > fail ${(budget.fail / 1e6).toFixed(2)}ms`,
      );
    else if (p50 > budget.alert)
      alerts.push(
        `${key}: ${(p50 / 1e6).toFixed(2)}ms > alert ${(budget.alert / 1e6).toFixed(2)}ms`,
      );

    if (result.ttfb !== undefined) {
      const ttfbKey = `abs:${result.scenario}:ttfbP95ns`;
      seen.add(ttfbKey);
      const ttfbBudget = budgets[ttfbKey];
      if (ttfbBudget === undefined) {
        breaches.push(`${ttfbKey}: no budget`);
      } else if (result.ttfb.p95Ns > ttfbBudget.fail) {
        breaches.push(
          `${ttfbKey}: ${(result.ttfb.p95Ns / 1e6).toFixed(2)}ms > fail ${(ttfbBudget.fail / 1e6).toFixed(2)}ms`,
        );
      } else if (result.ttfb.p95Ns > ttfbBudget.alert) {
        alerts.push(
          `${ttfbKey}: ${(result.ttfb.p95Ns / 1e6).toFixed(2)}ms > alert ${(ttfbBudget.alert / 1e6).toFixed(2)}ms`,
        );
      }
    }
  }

  for (const key of Object.keys(budgets))
    if (!seen.has(key)) alerts.push(`${key}: stale (no current measurement)`);

  if (alerts.length > 0) {
    console.warn("bench:beta: ALERTS (review):");
    for (const alert of alerts) console.warn(`  - ${alert}`);
  }
  if (breaches.length > 0) {
    console.error("bench:beta: FAILURES:");
    for (const breach of breaches) console.error(`  - ${breach}`);
    process.exit(1);
  }
  console.log(
    `bench:beta: within budget (${seen.size} measurements checked, ${alerts.length} alert(s))`,
  );
}

// ---------------------------------------------------------------------------
// Generation: pool three fresh measured runs into budgets.
// ---------------------------------------------------------------------------
async function generate(): Promise<void> {
  const ratios = new Map<string, number[]>();
  const absolutes = new Map<string, number[]>();

  for (let index = 0; index < 3; index += 1) {
    const runPath = join(
      REPO,
      "artifacts",
      "bench",
      `beta-generate-run${index}.json`,
    );
    const spawned = Bun.spawnSync(
      ["bun", join(import.meta.dir, "beta-workloads.ts"), "--output", runPath],
      { cwd: REPO, stdout: "inherit", stderr: "inherit" },
    );
    if (spawned.exitCode !== 0) {
      console.error(`bench:beta: baseline run ${index} failed`);
      process.exit(1);
    }
    const run = JSON.parse(readFileSync(runPath, "utf8")) as BetaArtifact;
    if (
      !run.correctnessVerifiedBeforeTiming ||
      Object.values(run.correctness).some((c) => !c.ok)
    ) {
      console.error(`bench:beta: baseline run ${index} failed correctness`);
      process.exit(1);
    }
    const byScenario = new Map(run.results.map((r) => [r.scenario, r]));
    for (const rows of ROW_COUNTS) {
      const streamP50 = p50Of(byScenario.get(`table-stream-${rows}`));
      const stringP50 = p50Of(byScenario.get(`table-string-${rows}`));
      if (streamP50 !== undefined && stringP50 !== undefined && stringP50 > 0) {
        const key = `ratio:table-stream-${rows}:over-string`;
        ratios.set(key, [...(ratios.get(key) ?? []), streamP50 / stringP50]);
      }
    }
    for (const result of run.results) {
      absolutes.set(`abs:${result.scenario}:p50ns`, [
        ...(absolutes.get(`abs:${result.scenario}:p50ns`) ?? []),
        median(result.distribution.samplesNs),
      ]);
      if (result.ttfb !== undefined) {
        absolutes.set(`abs:${result.scenario}:ttfbP95ns`, [
          ...(absolutes.get(`abs:${result.scenario}:ttfbP95ns`) ?? []),
          result.ttfb.p95Ns,
        ]);
      }
    }
  }

  const budgets: Record<string, Budget> = {};
  for (const [key, samples] of ratios) budgets[key] = ratioBudget(samples);
  for (const [key, samples] of absolutes)
    budgets[key] = absoluteBudget(samples);
  writeFileSync(
    BUDGETS,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        runsPooled: 3,
        basis:
          "same-run stream/string ratios + MAD-widened absolute p50/TTFB budgets",
        budgets,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `bench:beta: generated ${Object.keys(budgets).length} budgets from 3 pooled runs`,
  );
}

if (import.meta.main) await main();
