/**
 * CLI for `bun run architecture:check` (GH-005/GH-006).
 *
 * Loads the frozen rules from boundaries.json, scans every framework package
 * source through the pure engine, and prints a grouped, CI-friendly report.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { checkBoundaries, type BoundaryRules, type SourceFile } from "./engine";

const REPOSITORY_ROOT = join(import.meta.dir, "..", "..");
const rules = JSON.parse(
  readFileSync(join(import.meta.dir, "boundaries.json"), "utf8"),
) as BoundaryRules;

function listSourceFiles(absoluteDirectory: string): string[] {
  const files: string[] = [];
  if (!statSync(absoluteDirectory).isDirectory()) return files;
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absolutePath = join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(absolutePath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

const files: SourceFile[] = [];
for (const rule of Object.values(rules.packages)) {
  for (const absolutePath of listSourceFiles(
    join(REPOSITORY_ROOT, rule.path, "src"),
  )) {
    const path = relative(REPOSITORY_ROOT, absolutePath).split("\\").join("/");
    files.push({ path, source: readFileSync(absolutePath, "utf8") });
  }
}

const violations = checkBoundaries(rules, files);

if (violations.length > 0) {
  const byRule = new Map<string, string[]>();
  for (const violation of violations) {
    const list = byRule.get(violation.rule) ?? [];
    list.push(`${violation.file}: ${violation.message}`);
    byRule.set(violation.rule, list);
  }
  console.error(
    `architecture:check failed with ${violations.length} violation(s) across ` +
      `${byRule.size} rule(s) (rules: ADR-0016):`,
  );
  for (const [rule, messages] of byRule) {
    console.error(`  [${rule}]`);
    for (const message of messages) {
      console.error(`    - ${message}`);
    }
  }
  process.exit(1);
}

console.log(
  `architecture:check: ok (${files.length} source files, ` +
    `${Object.keys(rules.packages).length} package rules enforced)`,
);
