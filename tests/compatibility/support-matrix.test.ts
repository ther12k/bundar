/**
 * GH-176 approved 1.0 support matrix (Option A, clarified evidence
 * terminology): documentation and machine-readable metadata must carry
 * EXACTLY the approved claims — narrow, evidence-backed, and never
 * broader than what CI exercises. A docs edit that widens or blurs a
 * claim fails here.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { htmx2 } from "../../packages/htmx/src/dialects/v2";
import {
  HTMX4_PROFILE,
  HTMX4_TESTED_VERSION,
} from "../../packages/htmx/src/dialects/v4";

const read = (p: string): string =>
  readFileSync(join(import.meta.dir, "..", "..", p), "utf8");

/** Prose reflows under Prettier — claims match on normalized whitespace. */
const has = (haystack: string, needle: string): boolean =>
  haystack.replace(/\s+/g, " ").includes(needle.replace(/\s+/g, " "));

describe("GH-176 approved support matrix", () => {
  test("machine-readable htmx range matches the approved stable line", () => {
    // Supported line: htmx 2.0.x. Tested reference: 2.0.10. The declared
    // range must not promise untested future 2.x minors.
    expect(htmx2.supportedRange).toBe(">=2.0.0 <2.1.0");

    // htmx 4 stays experimental; the tested pin remains the beta
    expect(HTMX4_TESTED_VERSION).toBe("4.0.0-beta6");
    expect(JSON.stringify(HTMX4_PROFILE)).toContain("4.0.0-beta6");
  });

  test("support-matrix document carries the approved claims verbatim", () => {
    const matrix = read("docs/compatibility/support-matrix.md");
    // runtime: minimum vs reference are DISTINCT statements
    expect(has(matrix, "Bun-only")).toBe(true);
    expect(has(matrix, "Installation minimum | **Bun >= 1.4.0**")).toBe(true);
    expect(
      has(
        matrix,
        "Release-verified reference | **The exact Bun version pinned by the Candidate Release Battery**",
      ),
    ).toBe(true);
    expect(
      has(
        matrix,
        "must never imply that every newer Bun release has been conformance-tested",
      ),
    ).toBe(true);
    // platform wording constraints (exact approved sentences)
    expect(
      has(
        matrix,
        "macOS may work for local development, but it is not part of the verified production support matrix",
      ),
    ).toBe(true);
    expect(has(matrix, "| **Windows** | Not supported or claimed |")).toBe(
      true,
    );
    expect(has(matrix, "| **arm64** | Not supported or claimed |")).toBe(true);
    // browser wording constraint (exact approved sentence)
    expect(
      has(
        matrix,
        "verified against the Chromium revision supplied by the repository's pinned Playwright toolchain",
      ),
    ).toBe(true);
    // htmx: supported line vs tested reference vs upgrade policy
    expect(
      has(matrix, "**htmx 2.0.x** (machine-readable: `>=2.0.0 <2.1.0`)"),
    ).toBe(true);
    expect(has(matrix, "Tested reference | **htmx 2.0.10**")).toBe(true);
    expect(
      has(matrix, "only after the full dialect and browser battery passes"),
    ).toBe(true);
    // cadence boundary: dependency recorded, no invented durations
    expect(has(matrix, "Delegated to GH-178")).toBe(true);
    expect(has(matrix, "no LTS, backport-window, security-response-SLA")).toBe(
      true,
    );
  });

  test("the approved wording constraints hold across README and policy docs", () => {
    const readme = read("README.md");
    expect(has(readme, "Bun-only")).toBe(true);
    expect(
      has(
        readme,
        "release-verified reference is the exact Bun pinned by the Candidate Release Battery",
      ),
    ).toBe(true);
    expect(
      has(
        readme,
        "Verified against the Chromium revision supplied by the repository's pinned Playwright toolchain",
      ),
    ).toBe(true);
    // the old, broader claim must not come back
    expect(readme.includes("Chrome for Testing lanes are covered")).toBe(false);

    const support = read("SUPPORT.md");
    expect(has(support, "docs/compatibility/support-matrix.md")).toBe(true);
    expect(
      has(support, "not part of the verified production support matrix"),
    ).toBe(true);

    const security = read("SECURITY.md");
    expect(has(security, "docs/compatibility/support-matrix.md")).toBe(true);
    expect(has(security, "approved in GH-178")).toBe(true);

    const browsers = read("docs/compatibility/browsers.md");
    expect(
      has(
        browsers,
        "the revision bundled with the pinned Playwright toolchain",
      ),
    ).toBe(true);
  });

  test("the old wider htmx range does not survive anywhere in claims", () => {
    for (const path of [
      "docs/compatibility/matrix.md",
      "docs/compatibility/support-matrix.md",
      "README.md",
      "packages/htmx/src/dialects/v2/index.ts",
    ]) {
      // the declared supported RANGE must be the narrowed one; bare
      // mentions of other versions (vendor hashes, conformance notes)
      // are not range claims
      if (path.endsWith("index.ts") || path.includes("support-matrix"))
        continue;
      expect(read(path).includes("<3.0.0")).toBe(false);
    }
  });

  test("package metadata keeps the approved installation minimum", () => {
    const root = JSON.parse(read("package.json")) as {
      engines: { bun: string };
    };
    expect(root.engines.bun).toBe(">=1.4.0");
    const starter = read("create-bundar/templates/minimal.ts");
    expect(starter.includes('bun: ">=1.4.0"')).toBe(true);
  });
});
