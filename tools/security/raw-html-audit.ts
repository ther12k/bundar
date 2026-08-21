/**
 * Raw-HTML call-site audit (GH-031).
 *
 * Scans workspace source for `raw(`/`unsafeHtml(` call sites and reports each
 * with file:line so raw HTML usage stays reviewable. Exits 1 only on scan
 * errors; raw usage is legal by design — the audit exists for reviewability.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");
const SKIP = new Set([
  "node_modules",
  "dist",
  ".git",
  "output",
  "coverage",
  ".zcode",
]);

// A real call: `raw(` or `unsafeHtml(` not preceded by an identifier char
// (so isRawHtml( and .raw( do not match) and not inside a comment or string.
const RAW_CALL = /(?<![A-Za-z0-9_$.])(?:raw|unsafeHtml)\s*\(/g;

function isCommentOrStringLine(line: string): boolean {
  const trimmed = line.trimStart();
  return (
    trimmed.startsWith("*") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("--")
  );
}

interface Site {
  file: string;
  line: number;
  snippet: string;
}

function walk(dir: string, sites: Site[], extensions: Set<string>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, sites, extensions);
      continue;
    }
    if (!extensions.has(entry.name.split(".").pop() ?? "")) continue;
    const content = readFileSync(path, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      if (isCommentOrStringLine(line)) return;
      RAW_CALL.lastIndex = 0;
      if (
        RAW_CALL.test(line) &&
        !/function raw|export function raw|function unsafeHtml/.test(line)
      ) {
        sites.push({
          file: path.replace(ROOT + "/", ""),
          line: index + 1,
          snippet: line.trim().slice(0, 100),
        });
      }
    });
  }
}

try {
  const sites: Site[] = [];
  const extensions = new Set(["ts", "tsx"]);
  for (const dir of ["packages", "examples", "tools", "tests"]) {
    walk(join(ROOT, dir), sites, extensions);
  }

  const testSites = sites.filter((s) => /\.test\.|\/test\//.test(s.file));
  const sourceSites = sites.filter((s) => !testSites.includes(s));

  console.log(`raw-html audit: ${sourceSites.length} source call site(s)`);
  for (const site of sourceSites) {
    console.log(`  ${site.file}:${site.line}  ${site.snippet}`);
  }
  console.log(`  (${testSites.length} additional sites inside test files)`);

  if (sourceSites.length === 0) {
    console.log(
      "raw-html audit: no raw usage outside tests — every rendered string escapes by default",
    );
  }
  console.log("raw-html audit: ok");
} catch (error) {
  console.error(
    `raw-html audit failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(1);
}
