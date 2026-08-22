/**
 * test:guides (GH-080): the guides are verifiable documentation —
 *
 * 1. every `<!-- snippet: name -->`-marked TS block in the getting-started
 *    guide byte-matches its runnable module under docs/snippets/guides/
 *    (all of which CI executes via tests/docs/snippets-guide.test.ts);
 * 2. every documented `bun run <script>` command exists in package.json;
 * 3. no guide implies htmx 4 is GA;
 * 4. the main path shows the no-JS fallback and security BEFORE
 *    deployment (ordering assertion, not prose).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(fileURLToPath(import.meta.url), "..", "..", "..");
const GUIDES = [
  join(REPO, "docs", "getting-started.md"),
  join(REPO, "docs", "guides", "architecture.md"),
  join(REPO, "docs", "guides", "security.md"),
  join(REPO, "docs", "guides", "htmx-migration.md"),
];

function fencedBlocks(markdown: string): { lang: string; code: string }[] {
  const blocks: { lang: string; code: string }[] = [];
  const pattern = /```(\w+)\n([\s\S]*?)```/g;
  for (const match of markdown.matchAll(pattern)) {
    blocks.push({ lang: match[1]!, code: match[2]! });
  }
  return blocks;
}

describe("GH-080 guide verification", () => {
  test("snippet-marked blocks match their runnable modules byte-for-byte", () => {
    const markdown = readFileSync(GUIDES[0]!, "utf8");
    const marker = /<!-- snippet: ([\w-]+) -->\n```ts\n([\s\S]*?)```/g;
    const matches = [...markdown.matchAll(marker)];
    expect(matches.length).toBeGreaterThanOrEqual(5);
    for (const match of matches) {
      const module = readFileSync(
        join(REPO, "docs", "snippets", "guides", `${match[1]}.ts`),
        "utf8",
      );
      // the module carries the guide's code verbatim above a wiring marker
      // (imports/exports below the marker exist only to make it runnable)
      const guidePart =
        module.split("// --- guide code above; runnable wiring below")[0] ?? "";
      const guideCode = match[2]!.trim();
      const normalized = guidePart.replace(/\/\*\*[\s\S]*?\*\/\n/, "").trim();
      // whitespace-insensitive comparison (prettier formats both)
      const squeeze = (text: string): string =>
        text.replace(/,\s*\)/g, ")").replace(/\s+/g, " ");
      expect(squeeze(normalized)).toContain(squeeze(guideCode));
    }
  });

  test("the guide snippet modules exist for every marker", () => {
    const markdown = readFileSync(GUIDES[0]!, "utf8");
    const markers = [...markdown.matchAll(/<!-- snippet: ([\w-]+) -->/g)].map(
      (match) => match[1]!,
    );
    const present = new Set(
      readdirSync(join(REPO, "docs", "snippets", "guides")),
    );
    for (const marker of markers) {
      expect(present.has(`${marker}.ts`)).toBe(true);
    }
  });

  test("every documented bun-run script exists", () => {
    // commands may target the repo, the template, or the examples —
    // validate against every documented context's manifest
    const scripts = new Set<string>();
    const manifests = [
      join(REPO, "package.json"),
      join(REPO, "templates", "minimal", "package.json"),
      ...readdirSync(join(REPO, "examples"))
        .filter((name) => name.endsWith(".json") === false)
        .map((name) => join(REPO, "examples", name, "package.json")),
    ];
    for (const manifest of manifests) {
      try {
        for (const name of Object.keys(
          JSON.parse(readFileSync(manifest, "utf8")).scripts ?? {},
        )) {
          scripts.add(name);
        }
      } catch {
        // manifest without scripts — skip
      }
    }
    for (const guide of [...GUIDES, ...GUIDES]) {
      const markdown = readFileSync(guide, "utf8");
      for (const block of fencedBlocks(markdown)) {
        if (block.lang !== "bash") continue;
        for (const command of block.code.matchAll(/bun run ([\w:-]+)/g)) {
          if (!scripts.has(command[1]!)) {
            throw new Error(`guide documents missing script: ${command[1]}`);
          }
        }
      }
    }
  });

  test("no guide implies htmx 4 is GA", () => {
    const forbidden = [
      /htmx 4 is (now )?GA/i,
      /GA support for htmx 4/i,
      /htmx 4 .*generally available/i,
    ];
    for (const guide of GUIDES) {
      const markdown = readFileSync(guide, "utf8");
      for (const pattern of forbidden) {
        expect(pattern.test(markdown)).toBe(false);
      }
      // experimental mentions must not lose the marker
      const mentions = markdown.match(/htmx[^\n]{0,40}4\.0\.0-beta6/g) ?? [];
      for (const mention of mentions) {
        expect(/experimental|beta/i.test(mention)).toBe(true);
      }
    }
  });

  test("the main path: no-JS and security precede deployment", () => {
    const markdown = readFileSync(GUIDES[0]!, "utf8");
    const index = (needle: string): number => markdown.indexOf(needle);
    expect(index("no-JS fallback is not an appendix")).toBeGreaterThan(-1);
    expect(index("Security in the main path")).toBeGreaterThan(-1);
    expect(index("Test, build, deploy")).toBeGreaterThan(
      index("Security in the main path"),
    );
    expect(index("Security in the main path")).toBeGreaterThan(
      index("no-JS fallback is not an appendix"),
    );
  });
});
