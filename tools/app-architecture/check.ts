/**
 * CLI for the application feature-boundary checker (BR-023).
 *
 * Scans an application's source tree against ADR-0019 layer rules.
 * Deterministic: identical inputs produce byte-identical reports in both
 * human and --json modes; exit code 1 on any violation.
 *
 * Usage:
 *   bun tools/app-architecture/check.ts [appRoot] [--src src] [--mode compact] [--json]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { checkAppBoundaries, type AppConfig, type AppFile } from "./engine";

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const has = (flag: string) => process.argv.includes(flag);
const appRoot = process.argv[2]?.startsWith("--")
  ? process.cwd()
  : (process.argv[2] ?? process.cwd());
const config: AppConfig = {
  root: argument("--src", "src"),
  mode: (has("--compact") ? "compact" : "feature-sliced") as
    "feature-sliced" | "compact",
};

function listFiles(absoluteDirectory: string): string[] {
  if (!statSync(absoluteDirectory, { throwIfNoEntry: false })?.isDirectory())
    return [];
  const files: string[] = [];
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absolutePath = join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolutePath));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(absolutePath);
  }
  return files;
}

const files: AppFile[] = listFiles(join(appRoot, config.root)).map(
  (absolutePath) => ({
    path: relative(appRoot, absolutePath).split("\\").join("/"),
    source: readFileSync(absolutePath, "utf8"),
  }),
);

const violations = checkAppBoundaries(config, files);

if (has("--json")) {
  console.log(
    JSON.stringify(
      { root: appRoot, config, files: files.length, violations },
      null,
      2,
    ),
  );
} else if (violations.length > 0) {
  console.error(`app-architecture: ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`  [${violation.rule}] ${violation.message}`);
  }
} else {
  console.log(
    `app-architecture: ok (${files.length} files, mode=${config.mode})`,
  );
}
process.exit(violations.length > 0 ? 1 : 0);
