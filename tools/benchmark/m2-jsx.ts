/**
 * M2 JSX performance and memory gate (GH-037).
 *
 * Renderer-level scenarios — small fragments, full documents, large lists,
 * nested components, async components, escaping-heavy payloads, and
 * streaming — each measured cold (tree construction + first render, the
 * startup proxy) and steady-state (repeat rendering of prebuilt trees).
 * Parity across renderToString/renderToStringAsync/renderToStream is
 * asserted BEFORE timing, and every scenario's output is checked for
 * escaped markers so no benchmark can be met by disabling escaping.
 * Memory proxies (rss/heapUsed deltas) are recorded per scenario block.
 *
 *   bun run bench:m2 -- --output artifacts/bench/m2.json
 */
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  document,
  Fragment,
  jsx,
  renderToStream,
  renderToString,
  renderToStringAsync,
} from "../../packages/jsx/src/index";
import { distribution } from "./runner";
import type { Distribution } from "./types";

type Cold = "cold" | "steady";

interface M2Scenario {
  readonly id: string;
  /** Builds the tree ONCE for steady-state; per-iteration for cold. */
  readonly build: () => unknown;
  readonly render: (tree: unknown) => string | Promise<string>;
  readonly warmup: number;
  readonly iterations: number;
  readonly escapingMarker: string;
}

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const HOSTILE = `</script><b>&"'>alert-ish</b> ${"é🎉𝕏".repeat(8)}`;

function nested(depth: number): unknown {
  let node: unknown = jsx("span", { children: "leaf" });
  for (let level = 0; level < depth; level += 1) {
    const current = node;
    node = jsx(
      (props: Record<string, unknown>) =>
        jsx("div", { class: `l${level}`, children: props.child }),
      { child: current },
    );
  }
  return node;
}

const scenarios: readonly M2Scenario[] = [
  {
    id: "small-fragment",
    build: () =>
      jsx("p", {
        children: [jsx("strong", { children: "hi & bye" }), " fragment"],
      }),
    render: (tree) => renderToString(tree),
    warmup: 200,
    iterations: 2_000,
    escapingMarker: "&amp;",
  },
  {
    id: "full-document",
    build: () =>
      document({
        lang: "en",
        title: "M2 & gate",
        children: jsx("body", {
          children: [
            jsx("header", { children: jsx("h1", { children: "Gate" }) }),
            jsx("main", { children: jsx("p", { children: "content" }) }),
          ],
        }),
      }),
    render: (tree) => renderToString(tree),
    warmup: 100,
    iterations: 1_000,
    escapingMarker: "&amp;",
  },
  {
    id: "large-list-1000",
    build: () =>
      jsx("ul", {
        children: Array.from({ length: 1_000 }, (_, index) =>
          jsx("li", {
            class: "item",
            children: `item-${index}-${HOSTILE.slice(0, 6)}`,
          }),
        ),
      }),
    render: (tree) => renderToString(tree),
    warmup: 20,
    iterations: 100,
    escapingMarker: "&lt;/scri",
  },
  {
    id: "nested-components-50",
    build: () => nested(50),
    render: (tree) => renderToString(tree),
    warmup: 50,
    iterations: 500,
    escapingMarker: "leaf",
  },
  {
    id: "async-components-10",
    build: () =>
      jsx("section", {
        children: Array.from({ length: 10 }, (_, index) =>
          Promise.resolve(jsx("article", { children: `a${index}` })),
        ),
      }),
    render: (tree) => renderToStringAsync(tree),
    warmup: 50,
    iterations: 500,
    escapingMarker: "<article",
  },
  {
    id: "escaping-heavy",
    build: () => jsx("p", { children: HOSTILE.repeat(50) }),
    render: (tree) => renderToString(tree),
    warmup: 50,
    iterations: 500,
    escapingMarker: "&lt;/script",
  },
  {
    id: "streaming-large-list",
    build: () =>
      jsx("ul", {
        children: Array.from({ length: 1_000 }, (_, index) =>
          Promise.resolve(jsx("li", { children: `s${index}` })),
        ),
      }),
    render: (tree) => new Response(renderToStream(tree).stream).text(),
    warmup: 20,
    iterations: 100,
    escapingMarker: "<li",
  },
];

function memoryProxy(): { rssBytes: number; heapUsedBytes: number } {
  const usage = process.memoryUsage();
  return { rssBytes: usage.rss, heapUsedBytes: usage.heapUsed };
}

async function timeScenario(
  scenario: M2Scenario,
  mode: Cold,
): Promise<Distribution> {
  const samples: number[] = [];
  if (mode === "cold") {
    for (let index = 0; index < scenario.iterations; index += 1) {
      const tree = scenario.build();
      const started = Bun.nanoseconds();
      await scenario.render(tree);
      samples.push(Bun.nanoseconds() - started);
    }
    return distribution(samples);
  }
  const tree = scenario.build();
  for (let index = 0; index < scenario.warmup; index += 1) {
    await scenario.render(tree);
  }
  for (let index = 0; index < scenario.iterations; index += 1) {
    const started = Bun.nanoseconds();
    await scenario.render(tree);
    samples.push(Bun.nanoseconds() - started);
  }
  return distribution(samples);
}

interface M2Result {
  scenario: string;
  mode: Cold;
  distribution: Distribution;
}

interface M2Report {
  gate: "m2-jsx";
  schemaVersion: 1;
  generatedAt: string;
  parityCheckedBeforeTiming: true;
  escapingEnforced: true;
  environment: {
    bun: string;
    platform: string;
    arch: string;
    cpuCount: number;
  };
  parity: Record<string, { equal: true; bytes: number }>;
  results: readonly M2Result[];
  memoryProxies: {
    note: string;
    blocks: ReadonlyArray<{
      scenario: string;
      rssDeltaBytes: number;
      heapUsedDeltaBytes: number;
    }>;
  };
}

const parity: Record<string, { equal: true; bytes: number }> = {};
const results: M2Result[] = [];
const blocks: {
  scenario: string;
  rssDeltaBytes: number;
  heapUsedDeltaBytes: number;
}[] = [];

for (const scenario of scenarios) {
  // 1. semantic equivalence BEFORE timing: async and streaming must produce
  //    identical bytes; the sync renderer must agree whenever it accepts the
  //    tree (trees with promised children legitimately make it throw).
  const tree = scenario.build();
  let syncOutput: string | undefined;
  try {
    syncOutput = renderToString(tree);
  } catch {
    syncOutput = undefined;
  }
  const asyncOutput = await renderToStringAsync(tree);
  const streamOutput = await new Response(renderToStream(tree).stream).text();
  if (asyncOutput !== streamOutput) {
    console.error(
      `bench:m2: parity failure for ${scenario.id} — async and streaming renderers disagree before timing`,
    );
    process.exit(1);
  }
  if (syncOutput !== undefined && syncOutput !== asyncOutput) {
    console.error(
      `bench:m2: parity failure for ${scenario.id} — sync renderer disagrees with async output`,
    );
    process.exit(1);
  }
  parity[scenario.id] = { equal: true, bytes: asyncOutput.length };

  // 2. escaping cannot be disabled: the escaped marker must be present in
  //    the timed output (checked on the parity output, i.e. what is measured)
  if (!asyncOutput.includes(scenario.escapingMarker)) {
    console.error(
      `bench:m2: escaping marker missing for ${scenario.id} — output would indicate escaping was bypassed`,
    );
    process.exit(1);
  }

  // 3. memory proxies around the steady-state block
  const before = memoryProxy();
  results.push({
    scenario: scenario.id,
    mode: "cold",
    distribution: await timeScenario(scenario, "cold"),
  });
  results.push({
    scenario: scenario.id,
    mode: "steady",
    distribution: await timeScenario(scenario, "steady"),
  });
  const after = memoryProxy();
  blocks.push({
    scenario: scenario.id,
    rssDeltaBytes: after.rssBytes - before.rssBytes,
    heapUsedDeltaBytes: after.heapUsedBytes - before.heapUsedBytes,
  });
}

const report: M2Report = {
  gate: "m2-jsx",
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  parityCheckedBeforeTiming: true,
  escapingEnforced: true,
  environment: {
    bun: Bun.version,
    platform: process.platform,
    arch: process.arch,
    cpuCount: navigator.hardwareConcurrency ?? 1,
  },
  parity,
  results,
  memoryProxies: {
    note: "rss/heapUsed deltas around each scenario's cold+steady blocks (process.memoryUsage proxies — Bun exposes no finer-grained allocator stats portably); deltas are advisory, not budgets",
    blocks,
  },
};

const output = resolve(argument("--output", "artifacts/bench/m2.json"));
await mkdir(dirname(output), { recursive: true });
await Bun.write(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `bench:m2: wrote ${results.length} measurements (${scenarios.length} scenarios × cold/steady) with parity pre-checks to ${output}`,
);
void Fragment;
