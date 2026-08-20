/**
 * OKF v0.2 corpus discovery and parsing (GH-003).
 *
 * The repository root is the bundle root: `index.md` declares `okf_version`
 * and, together with `log.md` and every corpus `index.md`, is reserved (not a
 * concept document). Conventions come from references/okf-v0.2.md.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { parse as parseYaml } from "yaml";

export const BUNDLE_ROOT = join(import.meta.dir, "..", "..");

/** Directories at the bundle root that hold OKF concept documents. */
export const CORPUS_DIRECTORIES = [
  "architecture",
  "decisions",
  "delivery",
  "engineering",
  "github",
  "issues",
  "project",
  "protocol",
  "references",
] as const;

/** Root-level concept documents (everything else at root is operational). */
export const ROOT_CONCEPTS = [
  "README.md",
  "MASTER_AGENT_PROMPT.md",
  "bundle-report.md",
] as const;

export type Concept = {
  /** Bundle-relative path with forward slashes, e.g. "issues/m0/index.md". */
  path: string;
  isReserved: boolean;
  /** Parsed frontmatter, or null when absent or unparseable. */
  frontmatter: Record<string, unknown> | null;
  frontmatterError: string | null;
  links: string[];
};

export type IssueRecord = {
  path: string;
  stableId: string | null;
  milestone: string | null;
  dependsOn: string[];
  blocks: string[];
};

export type Corpus = {
  concepts: Concept[];
  issues: IssueRecord[];
};

function toBundlePath(absolutePath: string): string {
  return relative(BUNDLE_ROOT, absolutePath).split(sep).join("/");
}

function walkMarkdown(absoluteDirectory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absolutePath = join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkMarkdown(absolutePath));
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      found.push(absolutePath);
    }
  }
  return found;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function extractFrontmatter(content: string): {
  frontmatter: Record<string, unknown> | null;
  error: string | null;
} {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (match === null) return { frontmatter: null, error: null };
  const raw = match[1];
  if (raw === undefined) return { frontmatter: null, error: null };
  try {
    const parsed = parseYaml(raw) as Record<string, unknown>;
    return { frontmatter: parsed ?? {}, error: null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return {
      frontmatter: null,
      error: message.split("\n")[0] ?? "unparseable frontmatter",
    };
  }
}

function extractLinks(content: string): string[] {
  const links: string[] = [];
  const linkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1];
    if (target !== undefined) links.push(target);
  }
  return links;
}

function readIssue(concept: Concept): IssueRecord {
  const metadata = concept.frontmatter?.["issue"];
  const record: IssueRecord = {
    path: concept.path,
    stableId: null,
    milestone: null,
    dependsOn: [],
    blocks: [],
  };
  if (
    metadata === null ||
    metadata === undefined ||
    typeof metadata !== "object"
  )
    return record;
  const issue = metadata as Record<string, unknown>;
  if (typeof issue["stable_id"] === "string")
    record.stableId = issue["stable_id"];
  if (typeof issue["milestone"] === "string")
    record.milestone = issue["milestone"];
  if (Array.isArray(issue["depends_on"])) {
    record.dependsOn = issue["depends_on"].filter(
      (id): id is string => typeof id === "string",
    );
  }
  if (Array.isArray(issue["blocks"])) {
    record.blocks = issue["blocks"].filter(
      (id): id is string => typeof id === "string",
    );
  }
  return record;
}

export function loadCorpus(): Corpus {
  const absolutePaths = [
    ...ROOT_CONCEPTS.map((name) => join(BUNDLE_ROOT, name)),
    ...CORPUS_DIRECTORIES.flatMap((directory) =>
      walkMarkdown(join(BUNDLE_ROOT, directory)),
    ),
  ];

  const concepts: Concept[] = [];
  for (const absolutePath of absolutePaths) {
    if (!existsSync(absolutePath)) continue;
    const content = readFileSync(absolutePath, "utf8");
    const { frontmatter, error } = extractFrontmatter(content);
    const basename = toBundlePath(absolutePath).split("/").pop() ?? "";
    const isReserved =
      basename === "index.md" || toBundlePath(absolutePath) === "log.md";
    concepts.push({
      path: toBundlePath(absolutePath),
      isReserved,
      frontmatter,
      frontmatterError: error,
      links: extractLinks(content),
    });
  }

  const issues = concepts
    .filter(
      (concept) =>
        !concept.isReserved && concept.frontmatter?.["issue"] !== undefined,
    )
    .map(readIssue);

  return { concepts, issues };
}

/** Resolves a link target relative to a concept; returns null when it exists. */
export function resolveLinkTarget(
  conceptPath: string,
  target: string,
): string | null {
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(target) ||
    target.startsWith("#") ||
    target.startsWith("/")
  ) {
    return null; // external URL, anchor, or site-absolute: out of scope
  }
  const withoutAnchor = target.split("#")[0] ?? target;
  if (withoutAnchor === "") return null;
  const baseDir = dirname(join(BUNDLE_ROOT, conceptPath));
  const resolved = join(baseDir, withoutAnchor);
  if (!existsSync(resolved)) return resolved;
  if (statSync(resolved).isDirectory()) {
    const indexPath = join(resolved, "index.md");
    return existsSync(indexPath) ? null : indexPath;
  }
  return null; // exists as a file
}
