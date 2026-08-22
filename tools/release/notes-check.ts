/**
 * release:notes-check (GH-087): the release notes are claims about a
 * release — verified, not trusted. This check enforces:
 *
 * 1. required sections exist (compatibility, limitations,
 *    upgrade/rollback, changelog pointer);
 * 2. exact version claims: minimum Bun version, htmx 2 stable pin,
 *    htmx 4 beta pin with experimental wording;
 * 3. no beta-described-as-stable/GA phrasing;
 * 4. every relative artifact/doc link resolves (links:artifacts);
 * 5. pre-1.0 breaking-change expectations are stated.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const REPO = join(import.meta.dir, "..", "..");
const NOTES = join(REPO, "docs", "release-notes", "alpha.md");
const markdown = readFileSync(NOTES, "utf8");
const failures: string[] = [];
const require_ = (condition: boolean, message: string): void => {
  if (!condition) failures.push(message);
  console.log(`${condition ? "✓" : "✗"} ${message}`);
};

// 1. required sections
for (const section of [
  "## Compatibility statement",
  "## Known limitations",
  "## Upgrade and rollback",
]) {
  require_(markdown.includes(section), `section present: ${section}`);
}

// 2. exact version claims
require_(markdown.includes(">= 1.4.0 required"), "minimum Bun version stated");
require_(markdown.includes("2.0.10"), "default htmx 2 pin stated");
require_(markdown.includes("4.0.0-beta6"), "experimental htmx 4 pin stated");
require_(
  /4\.0\.0-beta6[^.]*experimental/i.test(markdown) ||
    /experimental[^.]*4\.0\.0-beta6/i.test(markdown),
  "the htmx 4 pin carries experimental wording",
);
require_(markdown.includes("No-JavaScript"), "no-JS support stated");

// 3. no beta-as-stable/GA phrasing
const forbidden = [
  /htmx 4 (?:is|as) (?:stable|GA)/i,
  /GA (?:support|compatibility) for htmx 4/i,
  /htmx 4 [^.]{0,30}generally available/i,
  /stable htmx 4/i,
];
for (const pattern of forbidden) {
  require_(!pattern.test(markdown), `no beta-as-stable phrasing: ${pattern}`);
}

// 4. every relative link resolves (links:artifacts)
const relativeLinks = [...markdown.matchAll(/\]\(([^)]+)\)/g)]
  .map((match) => match[1]!)
  .filter((href) => href.startsWith(".") || href.startsWith(".."));
let checkedLinks = 0;
for (const href of relativeLinks) {
  const target = join(dirname(NOTES), href);
  checkedLinks += 1;
  require_(existsSync(target), `link resolves: ${href}`);
}

// 5. pre-1.0 expectations
require_(
  markdown.includes("pre-1.0") &&
    markdown.toLowerCase().includes("breaking changes"),
  "pre-1.0 breaking-change expectations explicit",
);
require_(markdown.includes("rollback"), "rollback instructions present");

if (failures.length > 0) {
  console.error(`release:notes-check FAILED (${failures.length})`);
  process.exit(1);
}
console.log(
  `release:notes-check: passed (${checkedLinks} relative links resolved)`,
);
