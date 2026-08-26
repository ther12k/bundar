import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { adapters, invoke } from "../../tools/benchmark/adapters";
import {
  participatingAdapters,
  parityCheck,
  runBenchmark,
} from "../../tools/benchmark/runner";
import { scenarios } from "../../tools/benchmark/scenarios";

async function expectManifestClean(directory: string): Promise<void> {
  const manifestPath = `${directory}/package.json`;
  if (!existsSync(manifestPath)) return; // glob groups like create-bundar have the manifest at their root only when it exists
  const manifest = JSON.parse(await Bun.file(manifestPath).text());
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    expect(
      (manifest as Record<string, Record<string, unknown>>)[field]?.[
        "@carno.js/core"
      ],
    ).toBeUndefined();
  }
}

describe("benchmark parity", () => {
  test("all declared scenarios have equivalent behavior across participating adapters", async () => {
    const parity = await parityCheck();
    expect(parity).toHaveLength(scenarios.length);
    for (const [index, entry] of parity.entries()) {
      const scenario = scenarios[index]!;
      if ((scenario.excluded ?? []).length > 0) continue; // Bundar-only rows carry context snapshots, no comparison
      for (const snapshot of Object.values(entry.adapters)) {
        const reference = entry.adapters["raw-bun"]!;
        expect(snapshot?.status).toBe(reference.status);
        expect(snapshot?.body).toBe(reference.body);
      }
    }
  });

  test("JSX-model scenarios exclude every other adapter (BR-103): Bundar-only rows", () => {
    const jsxScenarios = scenarios.filter((scenario) => scenario.excluded);
    expect(jsxScenarios.map((scenario) => scenario.id).sort()).toEqual([
      "async-jsx-component",
      "escaped-jsx-fragment",
    ]);
    for (const scenario of jsxScenarios)
      expect([...(scenario.excluded ?? [])].sort()).toEqual([
        "carno",
        "hono",
        "raw-bun",
      ]);
  });

  test("JSX parity entries carry only the Bundar snapshot", async () => {
    const parity = await parityCheck();
    for (const entry of parity) {
      if (
        !["async-jsx-component", "escaped-jsx-fragment"].includes(
          entry.scenario,
        )
      )
        continue;
      expect(Object.keys(entry.adapters)).toEqual(["bundar"]);
    }
  });

  test("shared-surface scenarios keep the full four-adapter comparison", () => {
    for (const scenario of scenarios) {
      if ((scenario.excluded ?? []).length > 0) continue;
      const names = participatingAdapters(scenario).map((a) => a.name);
      expect(new Set(names)).toEqual(
        new Set(["raw-bun", "hono", "bundar", "carno"]),
      );
    }
  });

  test("parity executes in process without a network listener", async () => {
    const raw = adapters.find((adapter) => adapter.name === "raw-bun");
    expect(raw).toBeDefined();
    const snapshot = await invoke(raw!, scenarios[0]!);
    expect(snapshot.status).toBe(200);
    expect(snapshot.body).toBe("<p>static</p>");
  });

  test("Bundar parity comes from a real compiled app, not a stub", async () => {
    const bundar = adapters.find((adapter) => adapter.name === "bundar");
    expect(bundar).toBeDefined();
    expect(bundar!.version).not.toBe("deferred-until-m1");
    const snapshot = await invoke(bundar!, scenarios[0]!);
    expect(snapshot.status).toBe(200);
    expect(snapshot.body).toBe("<p>static</p>");
  });

  test("Carno reference is the reviewed pinned version", async () => {
    const carno = adapters.find((adapter) => adapter.name === "carno");
    expect(carno).toBeDefined();
    expect(carno!.version).toBe("1.7.0");
    const scenario = scenarios.find((s) => s.id === "service-access")!;
    const snapshot = await invoke(carno!, scenario);
    expect(snapshot.status).toBe(200);
    expect(snapshot.body).toBe('<p data-service="Bundar">service</p>');
  });

  test("Carno stays optional — root dev dependency only, never any workspace manifest", async () => {
    const root = JSON.parse(await Bun.file("package.json").text());
    expect(root.devDependencies["@carno.js/core"]).toBe("1.7.0");
    expect(root.dependencies?.["@carno.js/core"]).toBeUndefined();
    // BR-102: derive the scanned groups from the root manifest so a new
    // workspace group is covered automatically instead of two hard-coded
    // entries out of four.
    const workspaces: string[] = Array.isArray(root.workspaces)
      ? root.workspaces
      : Object.values(root.workspaces ?? {}).flat();
    expect(workspaces.length).toBeGreaterThanOrEqual(4);
    const forbiddenDependencyFields = [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ];
    let manifestsScanned = 0;
    for (const pattern of workspaces) {
      if (pattern.includes("*")) {
        const base = pattern.replace(/\*.*$/, "").replace(/\/$/, "");
        for (const entry of readdirSync(base, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          await expectManifestClean(`${base}/${entry.name}`);
          manifestsScanned += 1;
        }
      } else {
        await expectManifestClean(pattern);
        manifestsScanned += 1;
      }
    }
    expect(manifestsScanned).toBeGreaterThanOrEqual(12);
    expect(forbiddenDependencyFields).toHaveLength(4);
  });
});

describe("benchmark report", () => {
  test("includes raw samples, parity metadata, resources, and distributions", async () => {
    const originalArgv = process.argv;
    process.argv = [
      ...originalArgv,
      "--warmup",
      "1",
      "--iterations",
      "3",
      "--startup-samples",
      "1",
    ];
    try {
      const report = await runBenchmark();
      expect(report.schemaVersion).toBe(2);
      expect(report.methodology.parityCheckedBeforeTiming).toBe(true);
      expect(report.methodology.rawSamplesIncluded).toBe(true);
      expect(report.parity).toHaveLength(scenarios.length);
      const expectedResults = scenarios.reduce(
        (sum, scenario) => sum + participatingAdapters(scenario).length,
        0,
      );
      expect(report.results).toHaveLength(expectedResults);
      expect(report.resources.startup.map((s) => s.mode).sort()).toEqual([
        "bundar",
        "carno",
        "raw-bun",
      ]);
      expect(
        report.results.every(
          (result) => result.distribution.samplesNs.length === 3,
        ),
      ).toBe(true);
      expect(
        report.results.every(
          (result) => result.distribution.p95Ns >= result.distribution.p50Ns,
        ),
      ).toBe(true);
    } finally {
      process.argv = originalArgv;
    }
  });
});
