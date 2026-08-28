/**
 * docs:site:sync — renders the public developer docs website content from
 * the repository's docs/ tree (single source of truth, nothing duplicated
 * by hand).
 *
 * - The curated manifest (website/docs-manifest.json) decides which docs/
 *   files are public, their site slugs, and their titles.
 * - Existing YAML frontmatter in sources is stripped; Starlight frontmatter
 *   (title) is injected.
 * - Relative `.md` links are rewritten to site routes when the target is in
 *   the manifest, and to GitHub blob URLs otherwise, so synced pages never
 *   404 inside the site.
 * - Output goes to website/src/content/docs/<slug>.md (gitignored except
 *   the hand-written landing page) — deterministic, so docs:site:check can
 *   verify freshness by recomputation.
 *
 * Maintainer/engineering documents (maintainers/, okf/, performance/,
 * snippets/, delivery/, decisions/, issues/) are deliberately NOT synced:
 * the developer path stays separate from the engineering evidence corpus.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";

export const REPO_ROOT = resolve(import.meta.dir, "..", "..");
export const DOCS_ROOT = join(REPO_ROOT, "docs");
export const SITE_CONTENT = join(
  REPO_ROOT,
  "website",
  "src",
  "content",
  "docs",
);
export const MANIFEST_PATH = join(REPO_ROOT, "website", "docs-manifest.json");
const GITHUB_BLOB = "https://github.com/ther12k/bundar/blob/main/";

export interface ManifestItem {
  readonly src: string;
  readonly slug: string;
  readonly title: string;
}

export interface Manifest {
  readonly groups: readonly {
    readonly label: string;
    readonly items: readonly ManifestItem[];
  }[];
}

export function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
}

export function manifestItems(manifest: Manifest): ManifestItem[] {
  return manifest.groups.flatMap((group) => group.items);
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER, "");
}

function normalizeDocRelativePath(
  sourceRel: string,
  target: string,
): string | null {
  const baseDir = posix.dirname(sourceRel);
  return posix.normalize(posix.join(baseDir, target));
}

function normalizeRepoRelativePath(
  sourceRel: string,
  target: string,
): string | null {
  const absolute = resolve(DOCS_ROOT, dirname(sourceRel), target);
  return relative(REPO_ROOT, absolute).split(sep).join("/");
}

export function rewriteLinks(
  sourceRel: string,
  content: string,
  bySource: ReadonlyMap<string, ManifestItem>,
): string {
  return content.replace(
    /(\]\()([^)\s]+?)(\s+"[^"]*")?(\))/g,
    (full, open: string, target: string, title = "", close: string) => {
      if (
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.startsWith("#") ||
        target.startsWith("mailto:")
      ) {
        return full;
      }
      const [pathPart, anchor = ""] = target.split("#");
      const suffix = anchor ? `#${anchor}` : "";
      if (pathPart === undefined || !pathPart.endsWith(".md")) return full;
      const docRelative = normalizeDocRelativePath(sourceRel, pathPart);
      if (docRelative === null) return full;
      const mapped = bySource.get(docRelative);
      if (mapped !== undefined) {
        return `${open}/docs/${mapped.slug}/${suffix}${title}${close}`;
      }
      // Not curated for the site: keep the content reachable via GitHub.
      const repoRelative = normalizeRepoRelativePath(sourceRel, pathPart);
      return `${open}${GITHUB_BLOB}${repoRelative}${suffix}${title}${close}`;
    },
  );
}

export function transformPage(
  item: ManifestItem,
  raw: string,
  bySource: ReadonlyMap<string, ManifestItem>,
): string {
  const body = rewriteLinks(item.src, stripFrontmatter(raw), bySource);
  return [
    "---",
    `title: ${JSON.stringify(item.title)}`,
    "banner:",
    '  content: "Pre-1.0 alpha (0.1.0-alpha.2) — APIs may change. Published releases ride non-default dist-tags."',
    "---",
    "",
    body.trimStart(),
  ].join("\n");
}

export function run(): { pages: number } {
  const manifest = loadManifest();
  const items = manifestItems(manifest);
  const bySource = new Map(items.map((item) => [item.src, item]));
  let pages = 0;
  for (const item of items) {
    const raw = readFileSync(join(DOCS_ROOT, item.src), "utf8");
    const output = transformPage(item, raw, bySource);
    const destination = join(SITE_CONTENT, `${item.slug}.md`);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, output);
    pages += 1;
  }
  return { pages };
}

const isMain = import.meta.main;
if (isMain) {
  const { pages } = run();
  console.log(
    `docs:site:sync: rendered ${pages} pages into website/src/content/docs`,
  );
}
