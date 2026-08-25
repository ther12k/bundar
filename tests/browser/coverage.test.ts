/**
 * BR-074: the browser-coverage artifact must stay in sync with the
 * documented Chromium-only claim and remain machine-consumable by the
 * release gate.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dir, "../..");
const artifactPath = join(REPO, "artifacts/conformance/browsers.json");

interface BrowserConformance {
  readonly schema: string;
  readonly policy: {
    readonly testedEngines: readonly string[];
    readonly claimScope: string;
    readonly retryQuarantine: string;
  };
  readonly engines: readonly {
    readonly name: string;
    readonly lanes: readonly string[];
    readonly status: string;
  }[];
  readonly deferredEngines: readonly { readonly name: string }[];
}

const doc = JSON.parse(
  readFileSync(artifactPath, "utf8"),
) as BrowserConformance;

describe("BR-074 browser conformance coverage", () => {
  test("artifact is schema-valid and machine-consumable", () => {
    expect(doc.schema).toBe("bundar.browser-conformance/1");
    expect(doc.policy.testedEngines).toEqual(["chromium"]);
    expect(doc.engines).toHaveLength(1);
    expect(doc.engines[0]!.name).toBe("chromium");
    for (const lane of ["htmx2", "htmx4"]) {
      expect(doc.engines[0]!.lanes).toContain(lane);
    }
  });

  test("the claim explicitly narrows to Chromium (no silent gaps)", () => {
    const names = doc.deferredEngines.map((d) => d.name).sort();
    expect(names).toEqual(["firefox", "webkit"]);
    expect(doc.policy.claimScope).toContain("OUT OF SCOPE");
    expect(doc.policy.claimScope.toLowerCase()).toContain("narrow");
  });

  test("retry/quarantine policy cannot convert failures into warnings", () => {
    expect(doc.policy.retryQuarantine).toMatch(/No automatic retries/);
  });
});
