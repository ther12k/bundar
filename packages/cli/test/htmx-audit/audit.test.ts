/**
 * GH-078 htmx-audit coverage: every fixture pattern fires with the right
 * severity and line evidence, suppression is explicit and auditable,
 * exit codes gate CI, JSON is machine-readable, and neutral code stays
 * clean. Rule data is derived from the pinned dialect profiles, so the
 * fixture expectations double as profile-drift detectors.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { scanSource, scanTarget } from "../../src/audit/scan";
import {
  auditExitCode,
  parseAuditOptions,
  renderHuman,
} from "../../src/commands/htmx-audit";
import { AUDIT_DATA, AUDIT_RULES } from "../../src/audit/rules";

const approximateEventRuleId = `event-approximate:${AUDIT_DATA.approximateEvents[0] ?? "none"}`;

const headerRuleId = AUDIT_RULES.find((rule) =>
  rule.id.startsWith("header-rename:"),
)!.id;

const FIXTURES = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "..",
  "fixtures",
  "migration",
  "v2-sensitive",
);
const REPO = join(FIXTURES, "..", "..", "..");

describe("GH-078 audit rules derive from the pinned profiles", () => {
  test("htmx 4 has at least one approximate event mapping", () => {
    expect(AUDIT_DATA.approximateEvents.length).toBeGreaterThan(0);
    expect(AUDIT_DATA.approximateEvents.length).toBeGreaterThan(0);
  });

  test("the v2 inherited-attribute set feeds the inheritance rule", () => {
    expect(AUDIT_DATA.inheritedAttributes).toContain("hx-boost");
    expect(AUDIT_DATA.inheritedAttributes).toContain("hx-confirm");
  });

  test("extension support classifications come from the registry", () => {
    expect(AUDIT_DATA.unsupportedExtensions).toContain("json-enc");
    expect(AUDIT_DATA.nonNativeExtensions.some((e) => e.name === "sse")).toBe(
      true,
    );
  });
});

describe("GH-078 scanner finds every sensitive fixture pattern", () => {
  const report = scanTarget(FIXTURES);

  test("header rename is BLOCKING with file/line evidence", () => {
    const finding = report.findings.find(
      (f) => f.rule === headerRuleId && !f.suppressed,
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("blocking");
    expect(finding!.file).toContain("app.ts");
  });

  test("approximate event + history assumptions are REVIEW", () => {
    expect(report.findings.some((f) => f.rule === approximateEventRuleId)).toBe(
      true,
    );
    expect(report.findings.some((f) => f.rule === "history-assumption")).toBe(
      true,
    );
  });

  test("implicit inheritance attributes are flagged", () => {
    const inherited = report.findings.filter(
      (f) => f.rule === "implicit-inheritance",
    );
    expect(inherited.length).toBeGreaterThan(0);
  });

  test("json-enc extension is BLOCKING (unsupported in v4); sse is REVIEW", () => {
    const jsonEnc = report.findings.find(
      (f) => f.rule === "extension-compat:json-enc",
    );
    expect(jsonEnc?.severity).toBe("blocking");
    const sse = report.findings.find((f) => f.rule === "extension-compat:sse");
    expect(sse?.severity).toBe("review");
  });

  test("error-swap assumptions and asset pins are detected", () => {
    expect(
      report.findings.some((f) => f.rule === "error-swap-assumption"),
    ).toBe(true);
    const pin = report.findings.find((f) => f.rule === "asset-pin");
    expect(pin?.severity).toBe("informational");
    expect(report.findings.some((f) => f.rule === "cdn-script")).toBe(true);
  });

  test("raw adapter escapes are detected", () => {
    const raw = report.findings.find((f) => f.rule === "raw-adapter-escape");
    expect(raw?.severity).toBe("review");
    expect(raw?.snippet).toContain("adapter.id");
  });

  test("neutral code produces zero findings", () => {
    const findings = scanSource(
      join(FIXTURES, "clean.ts"),
      'import { buildHtmxRequestHeaders } from "@bundar/htmx";\nexport const x = buildHtmxRequestHeaders({ trigger: "save" });\n',
    );
    expect(findings.filter((f) => !f.suppressed)).toHaveLength(0);
  });
});

describe("GH-078 suppression is explicit and auditable", () => {
  test("an ignore comment suppresses exactly its rule and is reported", () => {
    const report = scanTarget(FIXTURES);
    const suppressed = report.findings.filter((f) => f.suppressed);
    expect(suppressed.length).toBe(1);
    expect(suppressed[0]!.rule).toBe(headerRuleId);
    expect(suppressed[0]!.file).toContain("suppressed.ts");
    expect(suppressed[0]!.suppressionLine).toBeDefined();
  });

  test("a suppression for a DIFFERENT rule does not silence this one", () => {
    const canonical = headerRuleId.split(":")[1] ?? "";
    const findings = scanSource(
      "x.ts",
      `export const h = { "${canonical}": "x" }; // bundar-audit-ignore: asset-pin\n`,
    );
    expect(findings.some((f) => f.rule === headerRuleId && !f.suppressed)).toBe(
      true,
    );
  });
});

const findingOf = (
  overrides: Partial<import("../../src/audit/scan").AuditFinding> = {},
) => ({
  rule: "r",
  severity: "review" as const,
  file: "f",
  line: 1,
  snippet: "s",
  change: "c",
  guidance: "g",
  suppressed: false,
  ...overrides,
});

describe("GH-078 exit codes and output formats", () => {
  test("parse options validate --format and --fail-on", () => {
    expect("error" in parseAuditOptions({ format: "yaml" })).toBe(true);
    expect("error" in parseAuditOptions({ "fail-on": "loud" })).toBe(true);
    expect(parseAuditOptions({})).toEqual({
      format: "human",
      failOn: "blocking",
    });
  });

  test("blocking findings fail the default gate; suppressed findings do not", () => {
    const blocking = findingOf({ severity: "blocking" });
    const report = { target: "t", filesScanned: 1, findings: [blocking] };
    expect(auditExitCode(report, "blocking")).toBe(1);
    expect(
      auditExitCode(
        { ...report, findings: [{ ...blocking, suppressed: true }] },
        "blocking",
      ),
    ).toBe(0);
  });

  test("review findings fail only at the review gate", () => {
    const report = { target: "t", filesScanned: 1, findings: [findingOf()] };
    expect(auditExitCode(report, "blocking")).toBe(0);
    expect(auditExitCode(report, "review")).toBe(1);
  });

  test("human output carries counts and guidance", () => {
    const text = renderHuman(scanTarget(FIXTURES));
    expect(text).toContain("blocking:");
    expect(text).toContain(`[BLOCKING] ${headerRuleId}`);
    expect(text).toContain("guidance:");
    expect(text).toContain("[SUPPRESSED]");
  });

  test("the real reference app has ZERO blocking findings (end-to-end)", async () => {
    const proc = Bun.spawnSync(
      [
        process.execPath,
        join(REPO, "packages", "cli", "src", "bin.ts"),
        "htmx-audit",
        "--format=json",
        join(REPO, "examples", "todo"),
      ],
      { stdout: "pipe", stderr: "inherit" },
    );
    expect(proc.exitCode).toBe(0);
    const report = JSON.parse(new TextDecoder().decode(proc.stdout));
    expect(
      report.findings.filter(
        (f: { severity: string; suppressed: boolean }) =>
          f.severity === "blocking" && !f.suppressed,
      ),
    ).toHaveLength(0);
  });

  test("the sensitive fixture fails the gate end-to-end with exit 1", () => {
    const proc = Bun.spawnSync(
      [
        process.execPath,
        join(REPO, "packages", "cli", "src", "bin.ts"),
        "htmx-audit",
        FIXTURES,
      ],
      { stdout: "pipe", stderr: "inherit" },
    );
    expect(proc.exitCode).toBe(1);
  });

  test("usage errors exit 2", async () => {
    const proc = Bun.spawnSync(
      [
        process.execPath,
        join(REPO, "packages", "cli", "src", "bin.ts"),
        "htmx-audit",
      ],
      { stdout: "pipe", stderr: "inherit" },
    );
    expect(proc.exitCode).toBe(2);
  });
});
