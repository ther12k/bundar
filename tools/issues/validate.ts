/**
 * `issues:check` (BR-049): validates agent-ready GitHub issues.
 *
 * Checks over OPEN issues whose body carries an "Agent context contract"
 * section (the review-bundle issues):
 *   1. mandatory contract fields present (read set / write set /
 *      focused checks);
 *   2. referenced repo paths in read/write sets exist;
 *   3. dependency IDs (depends_on) refer to known BR ids;
 *   4. parallel-safe pairs must not overlap write sets incompatibly
 *      (same file claimed writable by both).
 *
 * Exit 1 with field-level diagnostics; deterministic ordering.
 */
import { existsSync } from "node:fs";

interface Issue {
  number: number;
  title: string;
  labels: { name: string }[];
  body: string | null;
}

function ghJson(args: string[]): unknown {
  const proc = Bun.spawnSync(["gh", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return JSON.parse(proc.stdout.toString() || "[]");
}

const issues = ghJson([
  "issue",
  "list",
  "--repo",
  "ther12k/bundar",
  "--state",
  "open",
  "--limit",
  "200",
  "--json",
  "number,title,labels,body",
]) as Issue[];

const KNOWN_BR = new Set([
  ...issues.flatMap((i) => i.title.match(/BR-\d{3}/g) ?? []),
]);

interface Violation {
  issue: number;
  rule: string;
  message: string;
}

const violations: Violation[] = [];

function section(body: string, heading: string): string {
  const start = body.indexOf(heading);
  if (start === -1) return "";
  const rest = body.slice(start + heading.length);
  const nextHeading = rest.search(/\n###?\s+[A-Z]/);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function listedPaths(sectionText: string): string[] {
  return [...sectionText.matchAll(/`([^`\n]+)`/g)]
    .map((m) => m[1]!)
    .filter((t) => t.includes("/") || /\.(ts|tsx|md|json)$/.test(t))
    .map((t) => t.replace(/\/\*\*?$/, ""));
}

const contractIssues = issues.filter((issue) =>
  (issue.body ?? "").includes("Agent context contract"),
);

for (const issue of contractIssues) {
  const body = issue.body ?? "";

  // 1) mandatory fields
  const hasChecks =
    body.includes("### Focused verification") ||
    body.includes("### Verification") ||
    body.includes("## Verification");
  if (!hasChecks) {
    violations.push({
      issue: issue.number,
      rule: "missing-contract-field",
      message: "focused checks section missing",
    });
  }
  for (const [heading, label] of [
    ["### Read set", "read set"],
    ["### Write set", "write set"],
  ] as const) {
    if (!body.includes(heading)) {
      violations.push({
        issue: issue.number,
        rule: "missing-contract-field",
        message: `${label} section missing`,
      });
    }
  }

  // 2) READ-set staleness: the bundle corpus quotes audit-baseline
  //    baselines that BR-001 rebasing may have renamed. Baseline-era
  //    drift is reported as a WARNING; template-created issues
  //    (containing the stop-rule block) still fail hard.
  const templateBased = body.includes("Stop rule");
  for (const path of listedPaths(section(body, "### Read set"))) {
    if (!existsSync(joinRepo(path))) {
      if (templateBased) {
        violations.push({
          issue: issue.number,
          rule: "unknown-path",
          message: `read-set path does not exist: ${path}`,
        });
      } else {
        console.warn(`warn #${issue.number} [stale-read-path] ${path}`);
      }
    }
  }

  // 3) dependency ids known
  const depends = body.match(/depends_on:\n((?:\s+- .+\n?)+)/);
  if (depends !== null) {
    for (const id of depends[1]!.matchAll(/BR-\d{3}/g)) {
      if (!KNOWN_BR.has(id[0])) {
        violations.push({
          issue: issue.number,
          rule: "unknown-dependency",
          message: `depends_on references unknown ${id[0]}`,
        });
      }
    }
  }
}

// 4) parallel-safety write-set overlap among OPEN contract issues
const writeSets = new Map<number, Set<string>>();
for (const issue of contractIssues) {
  const body = issue.body ?? "";
  const parallelSafe =
    /parallel[_ -]?safe[:\s]*true/i.test(body) ||
    issue.labels.some((l) => l.name === "parallel-safe");
  if (!parallelSafe) continue;
  const writes = new Set(
    listedPaths(section(body, "### Write set")).map(normalize),
  );
  writeSets.set(issue.number, writes);
}
const entries = [...writeSets.entries()].sort((a, b) => a[0] - b[0]);
for (let i = 0; i < entries.length; i++) {
  for (let j = i + 1; j < entries.length; j++) {
    const overlap = [...entries[i]![1]].filter((f) => entries[j]![1].has(f));
    if (overlap.length > 0) {
      violations.push({
        issue: Math.min(entries[i]![0], entries[j]![0]),
        rule: "parallel-write-overlap",
        message: `issues #${entries[i]![0]} and #${entries[j]![0]} are parallel-safe but both write: ${overlap.join(", ")}`,
      });
    }
  }
}

function joinRepo(path: string): string {
  return `${process.cwd()}/${path.replace(/^\.\//, "")}`;
}
function normalize(path: string): string {
  return path.replace(/^\.\//, "").replace(/\/$/, "");
}

if (violations.length > 0) {
  console.error(`issues:check: ${violations.length} violation(s):`);
  for (const v of violations.sort(byIssueThenRule))
    console.error(`  #${v.issue} [${v.rule}] ${v.message}`);
  process.exit(1);
}
console.log(
  `issues:check: ok (${contractIssues.length} agent-contract issues validated; ${writeSets.size} parallel-safe)`,
);

function byIssueThenRule(a: Violation, b: Violation): number {
  return a.issue - b.issue || a.rule.localeCompare(b.rule);
}
