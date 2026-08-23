/**
 * CLI for `bun run app:complexity:check` (BR-045).
 *
 * Scans the configured application trees. Soft-limit breaches are printed
 * as loud warnings; hard-limit breaches (without an approved, unexpired
 * exception) fail with exit code 1.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  checkComplexity,
  type ComplexityConfig,
  type SourceFile,
} from "./engine";

const REPOSITORY_ROOT = join(import.meta.dir, "..", "..");

const CONFIG_PATH = join(REPOSITORY_ROOT, "app-complexity.config.ts");
const config: ComplexityConfig & { apps?: readonly string[] } = (
  await import(CONFIG_PATH)
).default;

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

const files: SourceFile[] = [];
for (const app of config.apps ?? []) {
  for (const absolutePath of listFiles(join(REPOSITORY_ROOT, app))) {
    if (!absolutePath.startsWith(`${REPOSITORY_ROOT}/`)) continue;
    files.push({
      path: relative(REPOSITORY_ROOT, absolutePath).split("\\").join("/"),
      source: readFileSync(absolutePath, "utf8"),
    });
  }
}

const violations = checkComplexity(config, files);
const hard = violations.filter((v) => v.severity === "hard");
const soft = violations.filter((v) => v.severity === "soft");

for (const violation of soft)
  console.warn(`warn [${violation.rule}] ${violation.message}`);
if (hard.length > 0) {
  console.error(`app-complexity: ${hard.length} HARD budget breach(es):`);
  for (const violation of hard)
    console.error(`  [${violation.rule}] ${violation.message}`);
  process.exit(1);
}
console.log(
  `app-complexity: ok (${files.length} files; ${soft.length} soft warning(s))`,
);
