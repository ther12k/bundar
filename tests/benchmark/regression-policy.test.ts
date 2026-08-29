/**
 * GH-191 reference-environment policy: budget enforcement is bound to the
 * declared reference environment (the public Candidate Release Battery,
 * opted in via BUNDAR_BENCH_REFERENCE=1 or --reference). Everywhere else
 * the same comparison runs advisory. These tests pin the mode decision and
 * the pure evaluation the gate is built from.
 */
import { describe, expect, test } from "bun:test";
import {
  evaluateBudgets,
  isReferenceEnvironment,
  type BenchArtifact,
} from "../../tools/benchmark/regression";

const artifact: BenchArtifact = {
  results: [
    {
      scenario: "static-response",
      adapter: "raw-bun",
      distribution: { samplesNs: [1_000_000, 1_000_000, 1_000_000] },
    },
    {
      scenario: "static-response",
      adapter: "bundar",
      distribution: { samplesNs: [2_000_000, 2_000_000, 2_000_000] },
    },
  ],
  resources: {
    startup: [{ mode: "raw-bun", readyMsP50: 5.4, rssBytesP50: 1024 }],
  },
  parity: [],
};

describe("GH-191 reference-environment mode", () => {
  test("reference is opt-in via env or explicit flag", () => {
    expect(isReferenceEnvironment([], {})).toBe(false);
    expect(isReferenceEnvironment([], { BUNDAR_BENCH_REFERENCE: "1" })).toBe(
      true,
    );
    expect(isReferenceEnvironment(["--reference"], {})).toBe(true);
    // any other value is not an opt-in — explicit or nothing
    expect(isReferenceEnvironment([], { BUNDAR_BENCH_REFERENCE: "true" })).toBe(
      false,
    );
  });

  test("evaluateBudgets: ratio within budget, breach and alert boundaries", () => {
    const budgets = {
      "ratio:static-response:bundar": { alert: 2.5, fail: 3.5 },
    };
    const clean = evaluateBudgets(artifact, {
      ...budgets,
      // the fixture carries raw-bun startup keys too: the tool fails
      // closed on their missing budgets, so supply them
      "startup:raw-bun:readyMs": { alert: 99, fail: 999 },
      "startup:raw-bun:rssBytes": { alert: 4096, fail: 8192 },
    });
    expect(clean.breaches).toEqual([]);
    expect(clean.alerts).toEqual([]);
    expect(clean.checked).toBe(3); // ratio + two startup keys

    const startupBudgets = {
      "startup:raw-bun:readyMs": { alert: 99, fail: 999 },
      "startup:raw-bun:rssBytes": { alert: 4096, fail: 8192 },
    };
    const breached = evaluateBudgets(artifact, {
      "ratio:static-response:bundar": { alert: 1.5, fail: 1.9 },
      ...startupBudgets,
    });
    expect(breached.breaches).toHaveLength(1);
    expect(breached.breaches[0]).toContain("2.00× raw-bun");

    const alerted = evaluateBudgets(artifact, {
      "ratio:static-response:bundar": { alert: 1.9, fail: 2.5 },
      ...startupBudgets,
    });
    expect(alerted.breaches).toEqual([]);
    expect(alerted.alerts).toHaveLength(1);
  });

  test("missing budgets fail (a new scenario is a risk, not a pass)", () => {
    const verdict = evaluateBudgets(artifact, {});
    expect(verdict.breaches.some((line) => line.includes("no budget"))).toBe(
      true,
    );
  });

  test("stale budgets (no current measurement) alert", () => {
    const verdict = evaluateBudgets(artifact, {
      "ratio:static-response:bundar": { alert: 5, fail: 9 },
      "startup:raw-bun:readyMs": { alert: 99, fail: 999 },
      "startup:raw-bun:rssBytes": { alert: 2048, fail: 4096 },
      "startup:phantom:readyMs": { alert: 99, fail: 999 },
    });
    expect(verdict.alerts.some((line) => line.includes("phantom"))).toBe(true);
    expect(verdict.breaches).toEqual([]);
  });

  test("startup absolute budgets breach on the recorded values", () => {
    const verdict = evaluateBudgets(artifact, {
      "startup:raw-bun:readyMs": { alert: 5.0, fail: 5.2 },
      "startup:raw-bun:rssBytes": { alert: 2048, fail: 4096 },
    });
    // 5.4ms > 5.2 fail — the drift canary must trip, not hide
    expect(
      verdict.breaches.some((line) => line.includes("startup:raw-bun:readyMs")),
    ).toBe(true);
  });
});
