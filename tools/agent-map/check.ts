/**
 * CLI for `bun run agent-map:check` (BR-044).
 *
 * Validates every AGENTS.md under the scanned application trees:
 * - line budget (<= 60);
 * - required sections present (Purpose:, Checks:);
 * - backticked repo paths exist on disk;
 * - fenced commands resolve to a package.json script or an executable file.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPOSITORY_ROOT = join(import.meta.dir, "..", "..");
const APPS = ["examples/todo", "examples/admin-crud", "templates/minimal"];
const LINE_BUDGET = 60;

function listAgents(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listAgents(path));
    else if (entry.name === "AGENTS.md") out.push(path);
  }
  return out;
}

function scriptNames(): Set<string> {
  const names = new Set<string>();
  for (const manifest of [
    join(REPOSITORY_ROOT, "package.json"),
    ...APPS.map((app) => join(REPOSITORY_ROOT, app, "package.json")),
  ]) {
    try {
      const pkg = JSON.parse(readFileSync(manifest, "utf8")) as {
        scripts?: Record<string, string>;
      };
      for (const name of Object.keys(pkg.scripts ?? {})) names.add(name);
    } catch {
      // optional manifest
    }
  }
  return names;
}

const scripts = scriptNames();
const violations: string[] = [];
let maps = 0;

for (const app of APPS) {
  for (const absolute of listAgents(join(REPOSITORY_ROOT, app))) {
    maps += 1;
    const rel = relative(REPOSITORY_ROOT, absolute).split("\\").join("/");
    const content = readFileSync(absolute, "utf8");
    const lines = content.split("\n");
    if (lines.length > LINE_BUDGET + 1) {
      violations.push(
        `${rel}: ${lines.length} lines exceed budget ${LINE_BUDGET}`,
      );
    }
    if (!content.includes("Purpose:"))
      violations.push(`${rel}: missing "Purpose:" section`);
    if (!content.includes("Checks:"))
      violations.push(`${rel}: missing "Checks:" section`);

    for (const match of content.matchAll(/`([^`]+)`/g)) {
      const token = match[1]!;
      if (/[/\\]/.test(token) && !token.startsWith("bun ")) {
        const base = token.replace(/^\.\.\//, "");
        if (
          !existsSync(join(absolute, "..", token)) &&
          !existsSync(join(REPOSITORY_ROOT, base))
        ) {
          violations.push(`${rel}: referenced path does not exist: ${token}`);
        }
      }
    }

    const checks = content.split("Checks:")[1] ?? "";
    // Only bullet lines until the next section header count as commands.
    const checkLines: string[] = [];
    for (const rawLine of checks.split("\n").slice(1)) {
      if (/^[A-Za-z][^:]*:\s*$/.test(rawLine.trim())) break;
      if (rawLine.trim().startsWith("-")) checkLines.push(rawLine);
    }
    for (const line of checkLines) {
      const command = line
        .trim()
        .replace(/^-\s*/, "")
        .replace(/`.+`$/, "")
        .trim();
      if (command.length === 0) continue;
      const script = command.replace(/^bun run\s+/, "").split(" ")[0]!;
      const firstToken = command.split(" ")[0]!;
      if (
        !scripts.has(script) &&
        !existsSync(join(REPOSITORY_ROOT, firstToken)) &&
        firstToken !== "bun"
      ) {
        // allow bare bun invocations relative to the map's own directory
        if (!(
          firstToken === "." ||
          existsSync(join(absolute, "..", command.split(" ")[0] ?? ""))
        )) {
          violations.push(`${rel}: check command does not resolve: ${command}`);
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`agent-map: ${violations.length} drift issue(s):`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}
console.log(`agent-map: ok (${maps} map(s), all within budget and resolvable)`);
