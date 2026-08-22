import { describe, expect, test } from "bun:test";
import { adapters, invoke } from "../../tools/benchmark/adapters";
import { parityCheck, runBenchmark } from "../../tools/benchmark/runner";
import { scenarios } from "../../tools/benchmark/scenarios";

describe("benchmark parity", () => {
  test("all declared scenarios have equivalent raw Bun, Hono, and Bundar behavior", async () => {
    const parity = await parityCheck();
    expect(parity).toHaveLength(scenarios.length);
    expect(
      parity.every(
        (entry) =>
          entry.adapters["raw-bun"].status === entry.adapters.hono.status &&
          entry.adapters["raw-bun"].status === entry.adapters.bundar.status,
      ),
    ).toBe(true);
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
      expect(report.results).toHaveLength(scenarios.length * 3);
      expect(report.resources.startup.map((s) => s.mode).sort()).toEqual([
        "bundar",
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
