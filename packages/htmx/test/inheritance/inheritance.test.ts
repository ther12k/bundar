/**
 * GH-047 inheritance compatibility tests.
 */
import { describe, expect, test } from "bun:test";
import {
  diagnoseInheritance,
  formatDisinherit,
  HTMX2_INHERITED_ATTRIBUTES,
  InheritancePolicyError,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";
import { htmx4Experimental } from "../../src/dialects/v4/index";

describe("GH-047 formatDisinherit", () => {
  test("formats single and multiple attribute disinheritance", () => {
    expect(formatDisinherit(["hx-target"])).toBe("hx-target");
    expect(formatDisinherit(["hx-target", "hx-swap", "hx-boost"])).toBe(
      "hx-target hx-swap hx-boost",
    );
  });

  test("accepts wildcard * for total disinheritance", () => {
    expect(formatDisinherit("*")).toBe("*");
  });

  test("rejects empty lists", () => {
    expect(() => formatDisinherit([])).toThrow(InheritancePolicyError);
  });
});

describe("GH-047 diagnoseInheritance", () => {
  test("identifies default inheritable attributes in htmx 2", () => {
    expect(diagnoseInheritance("hx-target", htmx2).inheritsByDefault).toBe(
      true,
    );
    expect(diagnoseInheritance("hx-swap", htmx2).inheritsByDefault).toBe(true);
    expect(diagnoseInheritance("hx-boost", htmx2).inheritsByDefault).toBe(true);
    expect(diagnoseInheritance("id", htmx2).inheritsByDefault).toBe(false);
  });

  test("diagnoses htmx 4 explicit-by-default inheritance rework", () => {
    const diag = diagnoseInheritance("hx-target", htmx4Experimental);
    expect(diag.inheritsByDefault).toBe(false);
    expect(diag.note).toContain("explicit-by-default");
  });

  test("HTMX2_INHERITED_ATTRIBUTES contains key common attributes", () => {
    expect(HTMX2_INHERITED_ATTRIBUTES.has("hx-target")).toBe(true);
    expect(HTMX2_INHERITED_ATTRIBUTES.has("hx-indicator")).toBe(true);
    expect(HTMX2_INHERITED_ATTRIBUTES.has("hx-confirm")).toBe(true);
  });
});
