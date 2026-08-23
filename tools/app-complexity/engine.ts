/**
 * File-size and responsibility budget engine (BR-045).
 *
 * Pure functions so fixtures can prove every rule. Line counts are an
 * imperfect smell — that is why they combine with the import-direction
 * rules of the boundary checker and why every diagnostic recommends a
 * STRUCTURAL remedy instead of merely reporting length.
 */

export type FileKind =
  | "routes"
  | "view"
  | "components"
  | "actions"
  | "schema"
  | "types"
  | "repository"
  | "composition"
  | "map"
  | "other";

export interface KindBudget {
  /** Warn at this many logical lines. */
  readonly soft: number;
  /** Fail at this many logical lines unless an approved exception covers it. */
  readonly hard: number;
}

export type Budgets = Readonly<Record<FileKind, KindBudget>>;

export const DEFAULT_BUDGETS: Budgets = {
  routes: { soft: 150, hard: 300 },
  view: { soft: 200, hard: 400 },
  components: { soft: 150, hard: 300 },
  actions: { soft: 150, hard: 250 },
  schema: { soft: 120, hard: 200 },
  types: { soft: 120, hard: 200 },
  repository: { soft: 120, hard: 200 },
  composition: { soft: 100, hard: 200 },
  map: { soft: 40, hard: 60 },
  other: { soft: 200, hard: 400 },
};

/** Approved exception: downgrades a hard breach to a loud warning. */
export interface BudgetException {
  readonly path: string;
  readonly owner: string;
  readonly reason: string;
  /** ISO date after which the exception expires into a failure. */
  readonly reviewDate: string;
}

export interface ComplexityConfig {
  readonly budgets?: Partial<Budgets>;
  readonly exceptions?: readonly BudgetException[];
  /** Path suffixes never counted (generated code, snapshots, data tables). */
  readonly excludedSuffixes?: readonly string[];
}

export interface SourceFile {
  readonly path: string;
  readonly source: string;
}

export interface ComplexityViolation {
  readonly file: string;
  readonly kind: FileKind;
  readonly rule: string;
  readonly message: string;
  readonly severity: "soft" | "hard";
}

const REMEDIES: Readonly<Record<FileKind, string>> = {
  routes:
    "split handlers per operation or move response shaping into views/actions",
  view: "extract reusable regions into sibling component modules",
  components: "split by UI concern or move business-shaped props to views",
  actions: "split use cases or push persistence behind the repository port",
  schema: "move unrelated input contracts to their owning features",
  types: "split models per aggregate; read models may live beside views",
  repository: "move secondary aggregates to their own feature slices",
  composition:
    "register feature route modules instead of defining handlers inline",
  map: "trim to purpose/invariants/zones/checks and link policies instead of restating them",
  other: "classify the file into a named layer or split it by responsibility",
};

export function kindOf(path: string): FileKind {
  if (/(^|\/)AGENTS\.md$/.test(path)) return "map";
  const base = path.split("/").pop() ?? "";
  if (/\.routes\.tsx?$/.test(base)) return "routes";
  if (/(\.view)\.tsx$/.test(base)) return "view";
  if (/(\.components|\.ui)\.tsx$/.test(base)) return "components";
  if (/(\.actions|\.service)\.tsx?$/.test(base)) return "actions";
  if (/\.schema\.tsx?$/.test(base)) return "schema";
  if (/\.types\.tsx?$/.test(base)) return "types";
  if (/\.repository\.tsx?$/.test(base)) return "repository";
  if (/^(main|app|index)\.tsx?$/.test(base)) return "composition";
  return "other";
}

/** Logical lines: no blanks, no whole-line comments, no block comments. */
export function countLogicalLines(source: string): number {
  let inBlock = false;
  let count = 0;
  for (const rawLine of source.split("\n")) {
    let line = rawLine.trim();
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      line = line.slice(end + 2).trim();
      inBlock = false;
      if (line.length === 0) continue;
    }
    while (line.length > 0) {
      if (line.startsWith("//")) {
        line = "";
        break;
      }
      if (line.startsWith("/*")) {
        const end = line.indexOf("*/", 2);
        if (end === -1) {
          inBlock = true;
          line = "";
          break;
        }
        line = line.slice(end + 2).trim();
        continue;
      }
      break;
    }
    if (line.length > 0) count += 1;
  }
  return count;
}

/** Top-level declarations: a cheap responsibility-spread signal. */
export function countTopLevelDeclarations(source: string): number {
  return (
    source.match(
      /^(export\s+)?(default\s+)?(async\s+)?(function\*?|class|interface|type|const|let|enum)\s+\w|^export\s+(default\s+)?\{/gm,
    )?.length ?? 0
  );
}

const EXCLUDED_DEFAULTS = [
  "routes.gen.ts",
  ".snap",
  ".snapshot.ts",
  ".data.ts",
  ".gen.ts",
  ".d.ts",
];

function isExcluded(config: ComplexityConfig, path: string): boolean {
  const list = [...(config.excludedSuffixes ?? []), ...EXCLUDED_DEFAULTS];
  return list.some((suffix) => path.endsWith(suffix));
}

function exceptionFor(
  config: ComplexityConfig,
  path: string,
): BudgetException | undefined {
  return (config.exceptions ?? []).find((exception) => exception.path === path);
}

function exceptionExpired(exception: BudgetException): boolean {
  return Date.now() > Date.parse(exception.reviewDate);
}

export function checkComplexity(
  config: ComplexityConfig,
  files: readonly SourceFile[],
): ComplexityViolation[] {
  const violations: ComplexityViolation[] = [];
  const merged: Budgets = { ...DEFAULT_BUDGETS, ...(config.budgets ?? {}) };

  for (const file of files) {
    if (isExcluded(config, file.path)) continue;
    const kind = kindOf(file.path);
    const budget = merged[kind]!;
    const logical = countLogicalLines(file.source);
    const declarations = countTopLevelDeclarations(file.source);

    if (logical <= budget.soft) continue;

    const exception = exceptionFor(config, file.path);
    const severity: "soft" | "hard" =
      logical > budget.hard && exception === undefined ? "hard" : "soft";

    // An expired exception fails regardless of size headroom.
    const failed =
      severity === "hard" ||
      (exception !== undefined && exceptionExpired(exception));

    const parts = [
      `${file.path}: ${kind} budget ${severity === "hard" ? "HARD" : "soft"} limit`,
      `${logical} logical lines (soft ${budget.soft}, hard ${budget.hard}), ${declarations} top-level declarations`,
    ];
    if (exception !== undefined) {
      parts.push(
        `approved exception by ${exception.owner} (${exception.reason}); review ${exception.reviewDate}${exceptionExpired(exception) ? " — EXPIRED, now failing" : ""}`,
      );
    }
    parts.push(`remedy: ${REMEDIES[kind]}`);

    violations.push({
      file: file.path,
      kind,
      rule: failed ? "size-budget-hard" : "size-budget-soft",
      message: parts.join("; "),
      severity: failed ? "hard" : "soft",
    });
  }

  return violations.sort(
    (a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule),
  );
}
