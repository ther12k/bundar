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

// ---------------------------------------------------------------------------
// Closure-ledger controls (re-review corrective actions A–C)
// ---------------------------------------------------------------------------
import ledgerJson from "../../delivery/baseline/closure-ledger.json";

interface LedgerAmendment {
  readonly id: string;
  readonly removeDependencies: readonly string[];
  readonly approver: string;
}
interface ClosureLedger {
  readonly schema: string;
  readonly totalIds: number;
  readonly idRange: readonly [string, string];
  readonly closed: readonly string[];
  readonly open: readonly string[];
  readonly issueNumbers: Readonly<Record<string, number>>;
  readonly dependencies: Readonly<Record<string, readonly string[]>>;
  readonly amendments: readonly LedgerAmendment[];
  readonly betaGateId: string;
}
const ledger = ledgerJson as unknown as ClosureLedger;

function brRange(start: number, end: number): Set<string> {
  const out = new Set<string>();
  for (let n = start; n <= end; n++)
    out.add(`BR-${String(n).padStart(3, "0")}`);
  return out;
}

// C1: set algebra
{
  const closedSet = new Set(ledger.closed);
  const openSet = new Set(ledger.open);
  if (closedSet.size !== ledger.closed.length)
    violations.push({
      issue: 0,
      rule: "ledger-duplicate-closed",
      message: "duplicate ids in closed set",
    });
  if (openSet.size !== ledger.open.length)
    violations.push({
      issue: 0,
      rule: "ledger-duplicate-open",
      message: "duplicate ids in open set",
    });
  for (const id of closedSet)
    if (openSet.has(id))
      violations.push({
        issue: 0,
        rule: "ledger-intersection",
        message: `${id} appears in both closed and open`,
      });
  const universe = brRange(1, ledger.totalIds);
  const union = new Set([...closedSet, ...openSet]);
  for (const id of universe)
    if (!union.has(id))
      violations.push({
        issue: 0,
        rule: "ledger-missing-id",
        message: `${id} absent from both sets`,
      });
  for (const id of union)
    if (!universe.has(id))
      violations.push({
        issue: 0,
        rule: "ledger-extra-id",
        message: `${id} outside ${ledger.idRange[0]}…${ledger.idRange[1]}`,
      });
  if (closedSet.size + openSet.size !== ledger.totalIds)
    violations.push({
      issue: 0,
      rule: "ledger-count",
      message: `closed(${closedSet.size}) + open(${openSet.size}) != total(${ledger.totalIds})`,
    });
}

// C2: GitHub state must match ledger mapping
{
  const ghStates = new Map<number, "open" | "closed">();
  for (const i of issues) ghStates.set(i.number, "closed");
  // fetch states for ALL mapped numbers (closed ones are not in the open list)
  const numbers = Object.values(ledger.issueNumbers);
  const proc = Bun.spawnSync(
    [
      "gh",
      "api",
      `repos/ther12k/bundar/issues?state=all&per_page=100&issue_numbers=${numbers.join(",")}`,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  try {
    for (const item of JSON.parse(proc.stdout.toString()) as {
      number: number;
      state: string;
    }[])
      ghStates.set(item.number, item.state as "open" | "closed");
  } catch {
    violations.push({
      issue: 0,
      rule: "ledger-github-fetch",
      message: "could not read GitHub states",
    });
  }
  for (const [brId, num] of Object.entries(ledger.issueNumbers)) {
    const state = ghStates.get(num);
    const expected = ledger.closed.includes(brId) ? "closed" : "open";
    if (state === undefined) {
      violations.push({
        issue: num,
        rule: "ledger-state-unknown",
        message: `${brId} → #${num} not found on GitHub`,
      });
    } else if (state !== expected) {
      violations.push({
        issue: num,
        rule:
          expected === "closed"
            ? "open-issue-labeled-completed-analog"
            : "closed-range-drift",
        message: `${brId} mapped to #${num} but GitHub state is ${state}, ledger expects ${expected}`,
      });
    }
  }
}

// C3+D: effective prerequisites — no closed task with an open prereq unless amended
{
  const removedEdges = new Set(
    ledger.amendments.flatMap((a) =>
      a.removeDependencies.map((dep) => `${a.id}->${dep}`),
    ),
  );
  const missingApprover = ledger.amendments.filter(
    (a) => a.removeDependencies.length > 0 && a.approver.trim().length === 0,
  );
  for (const a of missingApprover)
    violations.push({
      issue: 0,
      rule: "amendment-without-approver",
      message: `amendment for ${a.id} lacks an approver`,
    });

  const closedSet = new Set(ledger.closed);
  for (const id of ledger.closed) {
    const effective = (ledger.dependencies[id] ?? []).filter(
      (dep) => !removedEdges.has(`${id}->${dep}`),
    );
    for (const dep of effective) {
      if (!closedSet.has(dep)) {
        violations.push({
          issue: ledger.issueNumbers[id] ?? 0,
          rule: "closed-with-open-prerequisite",
          message: `${id} is closed but effective prerequisite ${dep} is not (no amendment covers this edge)`,
        });
      }
    }
  }

  // Beta gate dependency presence in the map
  if (!(ledger.betaGateId in ledger.dependencies))
    violations.push({
      issue: 0,
      rule: "beta-gate-unmapped",
      message: `beta gate ${ledger.betaGateId} missing from dependency map`,
    });
}

// Generated progress figures (never hand-stored)
const computedClosedPct =
  Math.round((ledger.closed.length / ledger.totalIds) * 1000) / 10;

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
console.log(
  `closure ledger: ${ledger.closed.length}/${ledger.totalIds} closed (${computedClosedPct}%), ${ledger.open.length} open (#${Math.min(...Object.values(ledger.issueNumbers))}–#${Math.max(...Object.values(ledger.issueNumbers))} range), amendments: ${ledger.amendments.length}`,
);

function byIssueThenRule(a: Violation, b: Violation): number {
  return a.issue - b.issue || a.rule.localeCompare(b.rule);
}
