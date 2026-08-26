import { describe, expect, test } from "bun:test";
import { renderToString } from "../../packages/jsx/src/index";
import {
  absoluteBudget,
  mad,
  median,
  ratioBudget,
  ROW_COUNTS,
  tableTree,
} from "../../tools/benchmark/beta-workloads";

describe("beta workload fixture", () => {
  test("table tree renders exactly rows+1 <tr> with escaping intact", () => {
    for (const rows of [3, 17]) {
      const html = renderToString(tableTree(rows));
      const rowCount = (html.match(/<tr[ >]/g) ?? []).length;
      expect(rowCount).toBe(rows + 1);
      expect(html).toContain("&lt;/td&gt;&lt;script&gt;");
      expect(html).not.toContain("</td><script>");
    }
  });

  test("declared row-count classes are the BR-077 tiers", () => {
    expect([...ROW_COUNTS]).toEqual([100, 1_000, 10_000]);
  });
});

describe("budget math", () => {
  test("median and MAD match direct computation", () => {
    expect(median([5, 1, 9, 3, 7])).toBe(5); // sorted middle element
    expect(median([2, 8])).toBe(8); // even lengths take sorted[length/2]
    expect(mad([2, 2, 2, 2], 2)).toBe(0);
    // deviations [4,2,4] sort to [2,4,4]; median picks index 1 -> 4
    expect(mad([6, 8, 14], 10)).toBe(4);
  });

  test("ratio budgets widen monotonically from p50 to alert to fail", () => {
    const budget = ratioBudget([1.1, 1.2, 1.15, 1.05, 1.3]);
    expect(budget.p50).toBeLessThanOrEqual(budget.alert);
    expect(budget.alert).toBeLessThanOrEqual(budget.fail);
    // documented factors: alert = p50 + 3·MAD + 0.3·p50,
    // fail = p50 + 6·MAD + 0.6·p50
    expect(budget.p50).toBeCloseTo(1.15, 5);
    expect(budget.alert).toBeCloseTo(1.15 + 3 * 0.05 + 0.3 * 1.15, 5);
    expect(budget.fail).toBeCloseTo(1.15 + 6 * 0.05 + 0.6 * 1.15, 5);
  });

  test("zero-dispersion ratios still widen by the 30%/60% safety factors", () => {
    const budget = ratioBudget([1.2, 1.2, 1.2]);
    expect(budget.alert).toBeCloseTo(1.2 * 1.3, 10);
    expect(budget.fail).toBeCloseTo(1.2 * 1.6, 10);
  });

  test("absolute budgets tolerate noise-dominated metrics but bound breaches", () => {
    // realistic 10k string-render p50 samples in ns with ~12% jitter
    const nsValues = [19_000_000, 21_500_000, 20_200_000];
    const budget = absoluteBudget(nsValues);
    const typical = median(nsValues);
    // p50 20.2ms, MAD 1.2ms -> alert adds 3·MAD + 75%, fail adds 6·MAD + 150%
    expect(budget.p50).toBe(typical);
    expect(budget.alert).toBeCloseTo(
      20_200_000 + 3 * 1_200_000 + 0.75 * 20_200_000,
      0,
    );
    expect(budget.fail).toBeCloseTo(
      20_200_000 + 6 * 1_200_000 + 1.5 * 20_200_000,
      0,
    );
    expect(2 * typical).toBeLessThan(budget.fail); // 2× survives load noise
    expect(3 * typical).toBeGreaterThan(budget.fail); // ~3× is a real breach
  });
});
