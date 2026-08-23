/**
 * create-bundar — project scaffolding (GH-071).
 *
 * Generates a minimal, runnable, secure-by-default Bundar application
 * with explicit dialect selection. Templates are code (./templates) so
 * every generated file is dialect-correct by construction.
 *
 * Safety contract: the target directory must be empty or not exist —
 * existing user files are never overwritten; the generator fails closed.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { minimalTemplate } from "../templates/minimal";
import { featureTemplate } from "../templates/feature";

/** Supported dialects: htmx 2 is the stable default; 4 is experimental. */
export type ScaffoldDialect = "htmx2" | "htmx4-experimental";

export const DIALECTS: readonly ScaffoldDialect[] = [
  "htmx2",
  "htmx4-experimental",
];

/** Supported application structures: compact is the documented default. */
export type ScaffoldStructure = "compact" | "feature";

export const STRUCTURES: readonly ScaffoldStructure[] = ["compact", "feature"];

export const DEFAULT_STRUCTURE: ScaffoldStructure = "compact";

export const HTMX4_EXPERIMENTAL_NOTICE = [
  "",
  "  ⚠  EXPERIMENTAL DIALECT SELECTED",
  "  htmx 4.0.0-beta6 is BETA software. No GA compatibility claim is",
  "  made or implied. Generated files carry a maturity banner; see",
  "  docs/compatibility/htmx4-beta6.md in the Bundar repository.",
  "",
].join("\n");

export interface CreateProjectOptions {
  /** Target directory (relative to cwd or absolute). */
  readonly target: string;
  readonly dialect: ScaffoldDialect;
  /** Application layout; default "compact" (ADR-0019). */
  readonly structure?: ScaffoldStructure;
  /** Package name; defaults to the directory's basename. */
  readonly name?: string;
  /** When true, render but write nothing (dry run). */
  readonly dryRun?: boolean;
}

export interface CreateProjectResult {
  readonly directory: string;
  readonly name: string;
  readonly dialect: ScaffoldDialect;
  readonly structure: ScaffoldStructure;
  readonly files: readonly string[];
  /** Rendered contents keyed by relative path (populated on dry runs). */
  readonly contents: Readonly<Record<string, string>>;
}

export class ScaffoldError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ScaffoldError";
  }
}

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

function packageNameFor(target: string, explicit?: string): string {
  const name = explicit ?? target.split("/").filter(Boolean).pop() ?? "";
  if (!NAME_PATTERN.test(name)) {
    throw new ScaffoldError(
      `invalid project name ${JSON.stringify(name)}: use lowercase letters, digits, ".", "-", "_"`,
    );
  }
  return name;
}

/** Validates the target: creatable parents, and never non-empty. */
export function validateTarget(target: string): string {
  const directory = isAbsolute(target)
    ? target
    : resolve(process.cwd(), target);
  if (existsSync(directory)) {
    const entries = readdirSync(directory);
    if (entries.length > 0) {
      throw new ScaffoldError(
        `refusing to scaffold into non-empty directory: ${directory} (${entries.length} entries)`,
      );
    }
  }
  return directory;
}

/** Generates the project. Throws ScaffoldError on any precondition failure. */
export function createProject(
  options: CreateProjectOptions,
): CreateProjectResult {
  if (!DIALECTS.includes(options.dialect)) {
    throw new ScaffoldError(
      `unknown dialect ${JSON.stringify(options.dialect)} (supported: ${DIALECTS.join(", ")})`,
    );
  }
  const structure = options.structure ?? DEFAULT_STRUCTURE;
  if (!STRUCTURES.includes(structure)) {
    throw new ScaffoldError(
      `unknown structure ${JSON.stringify(structure)} (supported: ${STRUCTURES.join(", ")})`,
    );
  }
  const directory = validateTarget(options.target);
  const name = packageNameFor(options.target, options.name);
  const context = { name, dialect: options.dialect };

  const template = structure === "feature" ? featureTemplate : minimalTemplate;

  // Deterministic order for byte-identical repeated generation.
  const entries = Object.entries(template.files).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const written: string[] = [];
  const contents: Record<string, string> = {};
  if (options.dryRun !== true) {
    mkdirSync(directory, { recursive: true });
  }
  for (const [relativePath, render] of entries) {
    const filePath = join(directory, relativePath);
    const rendered = render(context);
    contents[relativePath] = rendered;
    if (options.dryRun === true) continue;
    mkdirSync(join(filePath, ".."), { recursive: true });
    if (existsSync(filePath)) {
      // single-writer guarantee even if two renders race
      throw new ScaffoldError(`refusing to overwrite: ${filePath}`);
    }
    writeFileSync(filePath, rendered);
    written.push(relativePath);
  }

  return {
    directory,
    name,
    dialect: options.dialect,
    structure,
    files: options.dryRun === true ? Object.keys(contents) : written,
    contents,
  };
}

export { minimalTemplate };
