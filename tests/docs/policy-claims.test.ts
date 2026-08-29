/**
 * GH-178 policy claims: SECURITY.md and SUPPORT.md must carry the approved
 * support/security policy exactly — event-based versions, newest-in-channel
 * only, 7-day acknowledgement + 14-day initial assessment targets, no
 * remediation SLA, no LTS, major-only breaking removals — and must never
 * silently broaden scope. Prose reflows under Prettier, so claims match on
 * normalized whitespace.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string): string =>
  readFileSync(join(import.meta.dir, "..", "..", p), "utf8");
const has = (haystack: string, needle: string): boolean =>
  haystack.replace(/\s+/g, " ").includes(needle.replace(/\s+/g, " "));
const flat = (p: string): string => read(p).replace(/\s+/g, " ");

const SECURITY = flat("SECURITY.md");
const SUPPORT = flat("SUPPORT.md");
const PUBLISHING = read("docs/maintainers/publishing.md");
const MATRIX = flat("docs/compatibility/support-matrix.md");

describe("GH-178 policy claims — positive", () => {
  test("security response targets equal the approved values", () => {
    expect(
      has(SECURITY, "Acknowledgement target: within 7 calendar days"),
    ).toBe(true);
    expect(
      has(SECURITY, "Initial assessment target: within 14 calendar days"),
    ).toBe(true);
    expect(has(SECURITY, "Fix or disclosure deadline: none")).toBe(true);
    expect(has(SECURITY, "not a remediation SLA")).toBe(true);
  });

  test("SECURITY and SUPPORT agree on event-based supported versions", () => {
    for (const doc of [SECURITY, SUPPORT]) {
      expect(has(doc, "Before 1.0")).toBe(true);
      expect(has(doc, "newest")).toBe(true);
      expect(has(doc, "newest stable minor in the current major")).toBe(true);
    }
    expect(
      has(
        SUPPORT,
        "A prerelease is end-of-life when a newer prerelease supersedes it",
      ),
    ).toBe(true);
    expect(
      has(
        SUPPORT,
        "A stable minor is end-of-life when the next stable minor supersedes it",
      ),
    ).toBe(true);
  });

  test("latest is stable-only; prerelease channels are newest-in-channel", () => {
    expect(has(SUPPORT, "**Stable releases only** — never a prerelease")).toBe(
      true,
    );
    for (const channel of ["canary", "alpha", "beta", "rc"]) {
      expect(has(SUPPORT, `| \`${channel}\` |`)).toBe(true);
    }
    expect(has(SUPPORT, "Newest RC only; blocker fixes only")).toBe(true);
  });

  test("no LTS; no guaranteed old-minor backport", () => {
    expect(
      has(
        SUPPORT,
        "**No LTS commitment. No guaranteed backport to superseded minors.**",
      ),
    ).toBe(true);
    expect(has(SECURITY, "**LTS: none.**")).toBe(true);
    expect(
      has(
        SECURITY,
        "critical security backports to an older minor are maintainer-discretionary",
      ),
    ).toBe(true);
  });

  test("deprecation: documented, one minor of notice, major-only breaking removal", () => {
    expect(has(SECURITY, "at least one stable minor release")).toBe(true);
    expect(
      has(
        SUPPORT,
        "intentional breaking removals occur only in a major release after 1.0",
      ),
    ).toBe(true);
  });

  test("support-matrix references and platform scope remain consistent", () => {
    for (const doc of [SECURITY, SUPPORT]) {
      expect(doc.includes("docs/compatibility/support-matrix.md")).toBe(true);
    }
    expect(has(MATRIX, "Linux x64")).toBe(true);
    expect(has(MATRIX, "Bun-only")).toBe(true);
    expect(
      has(
        MATRIX,
        "the Chromium revision supplied by the repository's pinned Playwright toolchain",
      ),
    ).toBe(true);
    expect(
      has(SUPPORT, "not part of the verified production support matrix"),
    ).toBe(true);
    expect(SUPPORT.includes("Windows and arm64 are not claimed")).toBe(true);
    expect(
      has(
        MATRIX,
        "Event-based policy defined in `SECURITY.md` and `SUPPORT.md`",
      ),
    ).toBe(true);
  });

  test("publishing guide remains provisional until GH-130/GH-132 live canary", () => {
    expect(PUBLISHING.includes("status: draft")).toBe(true);
    expect(has(PUBLISHING, "operationally tested in rehearsal")).toBe(true);
    expect(has(PUBLISHING, "not yet authoritative")).toBe(true);
    expect(has(PUBLISHING, "GH-130/GH-132")).toBe(true);
  });
});

describe("GH-178 policy claims — negative (scope must not silently broaden)", () => {
  test("canonical policy sections never promise broader support", () => {
    for (const doc of [SECURITY, SUPPORT]) {
      expect(doc.toLowerCase().includes("all bun 1.x")).toBe(false);
      expect(doc.toLowerCase().includes("cross-platform")).toBe(false);
      expect(doc.toLowerCase().includes("all modern browsers")).toBe(false);
      expect(doc.toLowerCase().includes("windows supported")).toBe(false);
      expect(doc.toLowerCase().includes("arm64 supported")).toBe(false);
      expect(doc.toLowerCase().includes("24/7 support")).toBe(false);
      expect(doc.toLowerCase().includes("guaranteed response")).toBe(false);
      expect(doc.toLowerCase().includes("every bun release")).toBe(false);
    }
  });

  test("LTS appears only as an explicit denial, never as a promise", () => {
    for (const doc of [SECURITY, SUPPORT]) {
      // every occurrence of LTS must sit inside a denial phrase
      const around = doc.match(/.{0,40}LTS.{0,40}/gs) ?? [];
      expect(around.length).toBeGreaterThan(0);
      for (const context of around) {
        expect(/LTS: none|No LTS|no LTS/i.test(context)).toBe(true);
      }
    }
  });

  test("support-matrix no longer defers maintenance policy to GH-178", () => {
    // GH-178 stage 1 landed the policy; the matrix must not still carry
    // the pre-decision delegation wording
    expect(MATRIX.includes("Delegated to GH-178")).toBe(false);
    expect(MATRIX.includes("Until that decision lands")).toBe(false);
  });
});
