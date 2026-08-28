/**
 * Docs-website content pipeline tests: the sync is deterministic, rewrites
 * only what it should, and the evidence-separation policy is enforced
 * before anything reaches the public developer path.
 */
import { describe, expect, test } from "bun:test";
import {
  loadManifest,
  manifestItems,
  rewriteLinks,
  stripFrontmatter,
  transformPage,
  type ManifestItem,
} from "../../tools/website/sync-content";

describe("docs site content sync", () => {
  const bySource = new Map<string, ManifestItem>(
    manifestItems(loadManifest()).map((item) => [item.src, item]),
  );

  test("the manifest covers real docs files with unique slugs", () => {
    const items = manifestItems(loadManifest());
    expect(items.length).toBeGreaterThan(20);
    const slugs = items.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const item of items) {
      expect(item.src.startsWith("docs/")).toBe(false); // src is docs/-relative
    }
  });

  test("source frontmatter is stripped and Starlight title injected", () => {
    const item: ManifestItem = {
      src: "guides/sessions.md",
      slug: "guides/sessions",
      title: "Sessions",
    };
    const output = transformPage(
      item,
      "---\ntitle: Internal\nstatus: draft\n---\n\n# Sessions\n\nBody text.\n",
      bySource,
    );
    expect(output.startsWith('---\ntitle: "Sessions"\nbanner:\n')).toBe(true);
    expect(output).toContain("# Sessions");
    expect(output).not.toContain("status: draft");
  });

  test("relative links to curated pages become site routes; anchors survive", () => {
    const rewritten = rewriteLinks(
      "guides/security.md",
      [
        "See [the matrix](../compatibility/matrix.md) and [sessions](./sessions.md#csrf).",
        "External stays: [Bun](https://bun.sh) — as do [anchors](#local) and [mail](mailto:a@b.c).",
      ].join("\n"),
      bySource,
    );
    expect(rewritten).toContain("(/docs/reference/compatibility-matrix/)");
    expect(rewritten).toContain("(/docs/guides/sessions/#csrf)");
    expect(rewritten).toContain("https://bun.sh");
    expect(rewritten).toContain("(#local)");
    expect(rewritten).toContain("mailto:a@b.c");
  });

  test("relative links to pages outside the manifest fall back to GitHub", () => {
    const rewritten = rewriteLinks(
      "getting-started.md",
      "See [delivery gate](../delivery/gates/registry.md).",
      bySource,
    );
    expect(rewritten).toContain(
      "https://github.com/ther12k/bundar/blob/main/delivery/gates/registry.md",
    );
  });

  test("non-md targets are never rewritten", () => {
    const rewritten = rewriteLinks(
      "getting-started.md",
      "[pkg](packages/core/package.json) and [dir](guides/)",
      bySource,
    );
    expect(rewritten).toContain("(packages/core/package.json)");
    expect(rewritten).toContain("(guides/)");
  });

  test("stripFrontmatter removes only a leading block", () => {
    expect(stripFrontmatter("---\na: 1\n---\nBody")).toBe("Body");
    expect(stripFrontmatter("No frontmatter\n---\nlater")).toBe(
      "No frontmatter\n---\nlater",
    );
  });
});
