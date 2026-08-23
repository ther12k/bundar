/**
 * Milestone/release claim consistency check (BR-010).
 *
 * One repeatable command that keeps active landing documents consistent with
 * the alpha gate:
 *
 *   Rule 1 — forbidden stale phrases in ACTIVE documents (README.md,
 *            docs/**, delivery/**): design-archive wording ("not an
 *            implementation"), milestone lines presented as merely
 *            "planned" (allowed when the same line says "not planned" or
 *            "blocked"), affirmative htmx 4 GA claims, and M7 completion
 *            claims.
 *   Rule 2 — every design-corpus document under architecture/, project/,
 *            references/ carries a frontmatter `status:` field, so no
 *            historical/planned record can be mistaken for live status.
 *
 * Historical evidence is never rewritten; the check only enforces labeling.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

interface Violation {
  file: string;
  line: number;
  rule: string;
  snippet: string;
}

const violations: Violation[] = [];

function* markdownFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".zcode") continue;
      yield* markdownFiles(path);
    } else if (entry.name.endsWith(".md")) {
      yield path;
    }
  }
}

function checkActiveLine(rel: string, line: string, index: number): void {
  const lower = line.toLowerCase();

  if (/not an implementation/.test(lower)) {
    violations.push({
      file: rel,
      line: index + 1,
      rule: "design-archive",
      snippet: line.trim().slice(0, 100),
    });
  }

  if (
    /\bm[0-8]\b/.test(lower) &&
    /\bplanned\b/.test(lower) &&
    !/not planned|externally blocked|\bblocked\b/.test(lower)
  ) {
    violations.push({
      file: rel,
      line: index + 1,
      rule: "milestone-planned",
      snippet: line.trim().slice(0, 100),
    });
  }

  if (
    /\bm7\b/.test(lower) &&
    /\bcomplet(?:e|ed|ion)\b/.test(lower) &&
    !/not completed|externally blocked|deferred/.test(lower)
  ) {
    violations.push({
      file: rel,
      line: index + 1,
      rule: "m7-completion",
      snippet: line.trim().slice(0, 100),
    });
  }

  const mentionsHtmx4 = /htmx\s?4/i.test(line);
  const mentionsGA = /\bGA\b/.test(line);
  const negativeContext =
    /does not exist|no official GA|not mandatory|never assumed|externally blocked|when upstream|until htmx ?4 GA|GA support|is not GA|not been published|untested until|beta-only support|deferred because|reopen|experimental/i.test(
      line,
    );
  if (
    mentionsHtmx4 &&
    mentionsGA &&
    !negativeContext &&
    (/\bGA\s+(?:is|has|was)\b/i.test(line) ||
      /htmx\s?4\s+(?:is|now)\s+GA\b/i.test(line) ||
      /\bGA\s+release\s+of\s+htmx\s?4\b/i.test(line) ||
      /htmx\s?4\s+GA\s+(?:support|adapter)\s+(?:is|lands|arrives)\b(?!\s*not)/i.test(
        line,
      ))
  ) {
    violations.push({
      file: rel,
      line: index + 1,
      rule: "htmx4-ga-claim",
      snippet: line.trim().slice(0, 100),
    });
  }
}

// Rule 1: active documents
for (const rel of [
  "README.md",
  ...walkRelative("docs"),
  ...walkRelative("delivery"),
]) {
  const lines = readFileSync(join(ROOT, rel), "utf8").split("\n");
  lines.forEach((line, index) => checkActiveLine(rel, line, index));
}

function walkRelative(dir: string): string[] {
  return [...markdownFiles(join(ROOT, dir))].map((p) =>
    p.slice(ROOT.length + 1),
  );
}

// Rule 2: corpus status labeling
for (const rel of walkRelative("architecture").concat(
  walkRelative("project"),
  walkRelative("references"),
)) {
  const lines = readFileSync(join(ROOT, rel), "utf8").split("\n");
  const hasFrontmatter = lines[0]?.trim() === "---";
  const frontmatter = hasFrontmatter
    ? lines.slice(1, lines.indexOf("---", 1)).join("\n")
    : "";
  if (!/^status:/m.test(frontmatter)) {
    violations.push({
      file: rel,
      line: 1,
      rule: "corpus-status-missing",
      snippet: "(frontmatter must declare a status field)",
    });
  }
}

if (violations.length > 0) {
  console.error("docs:claims-check: FAILURES");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}:${v.line}  ${v.snippet}`);
  }
  console.error(
    "  Active documents must match the alpha gate; corpus records must carry",
    "a frontmatter status field. Fix wording or add labels — never rewrite evidence.",
  );
  process.exit(1);
}
console.log(
  "docs:claims-check: ok (active docs consistent with alpha gate; corpus labeled)",
);
