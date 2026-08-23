/**
 * Sink-boundary audit (BR-007).
 *
 * Machine-checked companion to docs/security/sink-inventory.md. Fails closed
 * when framework source gains an escape hatch that the inventory does not
 * register:
 *
 *   Rule A — HTMX protocol headers (`HX-*`) may only be WRITTEN inside the
 *            dialect adapter boundary (packages/htmx/src/**). Request-header
 *            names in type unions elsewhere are reads, not writes, and stay
 *            legal; this rule flags response-header writes (`.set(`/`.append(`
 *            or object-literal keys) outside the adapter.
 *   Rule B — `raw()`/`unsafeHtml()` production call sites must appear in the
 *            registered allowlist below. A new bypass requires a deliberate
 *            inventory edit plus review, never a silent addition.
 *
 * Examples/templates are application code and are reported but do not fail
 * the gate; framework packages fail closed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");

/** Files allowed to hold production raw()/unsafeHtml() call sites. */
const RAW_SOURCE_ALLOWLIST = new Set([
  // OOB/multi-region serialization: content is a framework-rendered fragment
  // string produced by the JSX renderer, never application-provided markup.
  "packages/htmx/src/updates.ts",
]);

const HX_WRITE = /["'`]HX-[A-Za-z-]+["'`]/;
const RAW_CALL = /(?<![A-Za-z0-9_$.])(?:raw|unsafeHtml)\s*\(/;

function isCommentLine(line: string): boolean {
  const t = line.trimStart();
  return (
    t.startsWith("*") ||
    t.startsWith("//") ||
    t.startsWith("/*") ||
    t.startsWith("--")
  );
}

interface Violation {
  rule: "A" | "B";
  file: string;
  line: number;
  snippet: string;
}

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path;
  }
}

const violations: Violation[] = [];

for (const pkg of readdirSync(join(ROOT, "packages"), {
  withFileTypes: true,
})) {
  if (!pkg.isDirectory()) continue;
  const srcDir = join(ROOT, "packages", pkg.name, "src");
  const adapterBoundary = `${pkg.name}/src` === "htmx/src";
  for (const path of sourceFiles(srcDir)) {
    const rel = path.slice(ROOT.length + 1);
    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (isCommentLine(line)) return;
      // Rule A: HX-* response-header writes outside packages/htmx/src
      if (!adapterBoundary && HX_WRITE.test(line)) {
        violations.push({
          rule: "A",
          file: rel,
          line: index + 1,
          snippet: line.trim().slice(0, 100),
        });
      }
      // Rule B: unregistered raw-render bypass in any framework src
      if (
        !/function raw|export function raw|function unsafeHtml/.test(line) &&
        RAW_CALL.test(line)
      ) {
        if (!RAW_SOURCE_ALLOWLIST.has(rel)) {
          violations.push({
            rule: "B",
            file: rel,
            line: index + 1,
            snippet: line.trim().slice(0, 100),
          });
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error("sink audit: FAILURES");
  for (const v of violations) {
    console.error(`  [rule ${v.rule}] ${v.file}:${v.line}  ${v.snippet}`);
  }
  console.error(
    "  Register intentional sinks in docs/security/sink-inventory.md and this",
    "allowlist, or move the write inside the owning boundary.",
  );
  process.exit(1);
}
console.log(
  `sink audit: ok (HX-* writes confined to packages/htmx/src; ${RAW_SOURCE_ALLOWLIST.size} registered raw site(s); see docs/security/sink-inventory.md)`,
);
