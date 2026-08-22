/**
 * The migration scanner (GH-078): walks TS/TSX/HTML/JSON files and applies
 * the rule set line by line. Suppression is explicit and auditable — a
 * trailing `bundar-audit-ignore: <rule-id>` comment suppresses that line's
 * finding and the suppression itself is reported in the JSON output.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_RULES, type AuditSeverity } from "./rules";

export interface AuditFinding {
  readonly rule: string;
  readonly severity: AuditSeverity;
  readonly file: string;
  readonly line: number;
  readonly snippet: string;
  readonly change: string;
  readonly guidance: string;
  readonly suppressed: boolean;
  /** Where the suppression comment lives (audit trail). */
  readonly suppressionLine?: number;
}

export interface AuditReport {
  readonly target: string;
  readonly filesScanned: number;
  readonly findings: readonly AuditFinding[];
}

const SCANNABLE = /\.(?:ts|tsx|html|json)$/;

const IGNORE_MARKER = /bundar-audit-ignore:\s*([\w:.-]+)/;

/** Collects scannable files under a path (directories recurse). */
export function collectFiles(target: string): string[] {
  const stats = statSync(target);
  if (stats.isFile()) return SCANNABLE.test(target) ? [target] : [];
  const files: string[] = [];
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = join(target, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full));
    else if (SCANNABLE.test(entry.name)) files.push(full);
  }
  return files.sort();
}

/** Scans one file's lines against every rule. */
export function scanSource(
  file: string,
  source: string,
): readonly AuditFinding[] {
  const findings: AuditFinding[] = [];
  const lines = source.split("\n");
  for (const rule of AUDIT_RULES) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (!rule.pattern.test(line)) continue;
      // explicit, auditable suppression: a bundar-audit-ignore comment on
      // the SAME line or the line directly above silences this rule
      const inline = IGNORE_MARKER.exec(line);
      const above = IGNORE_MARKER.exec(lines[index - 1] ?? "");
      // suppression matches the exact rule id or its family prefix
      // (e.g. "header-rename" covers "header-rename:<header>")
      const matches = (marker: string | undefined): boolean =>
        marker !== undefined &&
        (marker === rule.id || rule.id.startsWith(`${marker}:`));
      const suppressedByInline = matches(inline?.[1]);
      const suppressedByAbove = matches(above?.[1]);
      if (suppressedByInline || suppressedByAbove) {
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          file,
          line: index + 1,
          snippet: line.trim().slice(0, 160),
          change: rule.change,
          guidance: rule.guidance,
          suppressed: true,
          suppressionLine: suppressedByInline ? index + 1 : index,
        });
        continue;
      }
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        file,
        line: index + 1,
        snippet: line.trim().slice(0, 160),
        change: rule.change,
        guidance: rule.guidance,
        suppressed: false,
      });
    }
  }
  return findings.sort((a, b) =>
    a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file),
  );
}

/** Scans a file/directory target into a full report. */
export function scanTarget(target: string): AuditReport {
  const files = collectFiles(target);
  const findings = files.flatMap((file) => {
    try {
      return scanSource(file, readFileSync(file, "utf8"));
    } catch {
      return [];
    }
  });
  return { target, filesScanned: files.length, findings };
}
