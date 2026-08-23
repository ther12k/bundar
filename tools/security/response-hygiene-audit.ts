/**
 * `security:response-hygiene` (BR-056): fails when reference applications
 * reintroduce the patterns the security helpers replaced:
 *   - regex parsing of framework CSRF/session cookies;
 *   - manual Response reconstruction solely to append cookies/headers
 *     (`new Response(response.body` style clones);
 *   - hand-built Set-Cookie strings for framework cookies.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const APPS = ["examples/todo", "examples/admin-crud", "templates/minimal"];

const FORBIDDEN: readonly { name: string; pattern: RegExp }[] = [
  {
    name: "csrf-cookie-regex",
    pattern: /bundar\\.csrf=\[\^;\]/,
  },
  {
    name: "manual-response-reconstruction",
    pattern: /new Response\(\s*(?:response|res)\.body/,
  },
  {
    name: "hand-built-set-cookie",
    pattern: /["'`]set-cookie=["'`]?\s*\+|`bundar\.csrf=\$\{/,
  },
];

function* sourceFiles(dir: string): Generator<string> {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* sourceFiles(path);
    } else if (/\.(ts|tsx)$/.test(entry.name)) yield path;
  }
}

const violations: string[] = [];
for (const app of APPS) {
  for (const absolute of sourceFiles(join(ROOT, app))) {
    const rel = relative(ROOT, absolute).split("\\").join("/");
    const lines = readFileSync(absolute, "utf8").split("\n");
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*")
      )
        return;
      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(line)) {
          violations.push(
            `${rel}:${index + 1} [${rule.name}] ${trimmed.slice(0, 90)}`,
          );
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`response-hygiene: ${violations.length} violation(s):`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error(
    "  Use @bundar/core response mutation helpers and @bundar/security",
    "CSRF composition helpers instead.",
  );
  process.exit(1);
}
console.log(
  `response-hygiene: ok (${APPS.length} reference apps free of manual cookie/response reconstruction)`,
);
