/**
 * HTMX source diff and dialect branching guard (GH-055).
 *
 * Statically asserts that application code (e.g. `examples/dual-dialect-fixture/app.ts`)
 * contains ZERO dialect branching logic (`if (htmxVersion)`), no dialect conditionals,
 * and no raw protocol strings.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPOSITORY_ROOT = join(import.meta.dir, "..");
// GH-075: the canonical minimal starter is guarded alongside the
// dual-dialect fixture — application source stays dialect-neutral.
const TARGET_DIRS = [
  join(REPOSITORY_ROOT, "examples", "dual-dialect-fixture"),
  join(REPOSITORY_ROOT, "templates", "minimal"),
  join(REPOSITORY_ROOT, "examples", "todo"),
  join(REPOSITORY_ROOT, "examples", "admin-crud"),
];

const FORBIDDEN_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly reason: string;
}> = [
  {
    pattern: /\b(?:htmxVersion|dialectVersion|isHtmx4|isHtmx2)\b/,
    reason:
      "dialect version variable or conditional detected in application code",
  },
  {
    pattern: /dialect\.id\s*===/,
    reason: "dialect ID conditional check detected in application code",
  },
  {
    pattern: /"(?:HX-[A-Za-z-]+|htmx:[A-Za-z]+)"/,
    reason:
      "raw HTMX protocol string found in application code; use @bundar/htmx neutral helpers",
  },
];

function listFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // dist/ holds built bundles of the framework's own htmx internals
      if (entry.name !== "dist" && entry.name !== "node_modules") {
        result.push(...listFiles(full));
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      // Exclude server.ts which is the approved bootstrap / config point
      if (entry.name !== "server.ts") {
        result.push(full);
      }
    }
  }
  return result;
}

const failures: string[] = [];
const files = TARGET_DIRS.flatMap((dir) => listFiles(dir));

for (const filePath of files) {
  const rawContent = readFileSync(filePath, "utf8");
  // Strip comments so explanatory text does not trigger false positives
  const content = rawContent
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");
  const relPath = filePath.replace(REPOSITORY_ROOT + "/", "");
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      failures.push(`${relPath}: ${reason}`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    "htmx:source-diff: FAILED — dialect conditionals found in application code:",
  );
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `htmx:source-diff: ok (${files.length} application files verified zero dialect conditionals, no raw protocol strings)`,
);
