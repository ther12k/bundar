/**
 * `bundar htmx-audit` (GH-078): identify raw version-sensitive headers,
 * events, inheritance, extensions, history and error-swap assumptions,
 * asset pins, and raw adapter escapes BEFORE a project changes dialect.
 * The tool never rewrites source in v0.1 — it reports with evidence and
 * guidance; suppression is explicit and auditable.
 *
 * Usage:
 *   bundar htmx-audit <path>... [--format=human|json]
 *                      [--fail-on=blocking|review|informational]
 *
 * Exit codes (CI migration gates): 0 = below threshold; 1 = findings at
 * or above the threshold; 2 = usage error.
 */
import type { CommandContext, CommandDefinition } from "../cli";
import { scanTarget, type AuditReport } from "../audit/scan";
import { severityRank, type AuditSeverity } from "../audit/rules";

export interface AuditOptions {
  readonly format: "human" | "json";
  readonly failOn: AuditSeverity;
}

export function parseAuditOptions(
  flags: Readonly<Record<string, string | boolean>>,
): AuditOptions | { error: string } {
  const format =
    typeof flags["format"] === "string" ? flags["format"] : "human";
  if (format !== "human" && format !== "json") {
    return { error: `--format must be human or json (got ${format})` };
  }
  const failOn =
    typeof flags["fail-on"] === "string" ? flags["fail-on"] : "blocking";
  if (
    failOn !== "blocking" &&
    failOn !== "review" &&
    failOn !== "informational"
  ) {
    return {
      error: `--fail-on must be blocking, review, or informational (got ${failOn})`,
    };
  }
  return { format, failOn };
}

export function auditExitCode(
  report: AuditReport,
  failOn: AuditSeverity,
): number {
  const threshold = severityRank(failOn);
  const fails = report.findings.some(
    (finding) =>
      !finding.suppressed && severityRank(finding.severity) >= threshold,
  );
  return fails ? 1 : 0;
}

export function renderHuman(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(
    `htmx-audit: scanned ${report.filesScanned} file(s) under ${report.target}`,
  );
  const active = report.findings.filter((finding) => !finding.suppressed);
  const suppressed = report.findings.filter((finding) => finding.suppressed);
  const bySeverity = (severity: AuditSeverity): number =>
    active.filter((finding) => finding.severity === severity).length;
  lines.push(
    `  blocking: ${bySeverity("blocking")} · review: ${bySeverity("review")} · informational: ${bySeverity("informational")} · suppressed: ${suppressed.length}`,
  );
  for (const finding of active) {
    lines.push("");
    lines.push(
      `  [${finding.severity.toUpperCase()}] ${finding.rule} — ${finding.file}:${finding.line}`,
    );
    lines.push(`    ${finding.snippet}`);
    lines.push(`    change: ${finding.change}`);
    lines.push(`    guidance: ${finding.guidance}`);
  }
  for (const finding of suppressed) {
    lines.push("");
    lines.push(
      `  [SUPPRESSED] ${finding.rule} — ${finding.file}:${finding.line} (ignored at line ${finding.suppressionLine})`,
    );
  }
  if (active.length === 0 && suppressed.length === 0) {
    lines.push("  no version-sensitive patterns found");
  }
  return lines.join("\n");
}

export const htmxAuditCommand: CommandDefinition = {
  name: "htmx-audit",
  description: "Audit source for htmx 2→4 migration-sensitive patterns",
  handler: async (ctx: CommandContext): Promise<number> => {
    const options = parseAuditOptions(ctx.flags);
    if ("error" in options) {
      console.error(`htmx-audit: ${options.error}`);
      return 2;
    }
    if (ctx.args.length === 0) {
      console.error(
        "usage: bundar htmx-audit <path>... [--format=human|json] [--fail-on=blocking|review|informational]",
      );
      return 2;
    }
    const reports = ctx.args.map((target) => scanTarget(target));
    const combined = {
      target: ctx.args.join(", "),
      filesScanned: reports.reduce(
        (sum, report) => sum + report.filesScanned,
        0,
      ),
      findings: reports.flatMap((report) => report.findings),
    };
    if (options.format === "json") {
      console.log(JSON.stringify(combined, null, 2));
    } else {
      console.log(renderHuman(combined));
    }
    return auditExitCode(combined, options.failOn);
  },
};
