# Bundar Docs Website (`bundar.dev/docs`)

Documentation website for Bundar powered by [Astro](https://astro.build) and
[Starlight](https://starlight.astro.build).

## Architecture

1. **Single Source of Truth** — Developer documentation lives in the repository's
   canonical `docs/` tree. Content is never duplicated by hand.
2. **Curated Manifest** — `website/docs-manifest.json` defines which `docs/`
   files are included in the developer-facing public path, their site routes, and
   their titles.
3. **Evidence Separation** — Internal engineering records (`maintainers/`,
   `okf/`, `performance/`, `delivery/`, `decisions/`, `issues/`) are kept out of
   the public developer sidebar. `bun run docs:site:check` enforces that
   engineering work-item citations (`GH-###`, `BR-###`) do not appear in the
   developer documentation pages.
4. **Deterministic Link Rewriting** — Relative markdown links to curated pages are
   rewritten to `/docs/<slug>/` site routes; links to uncurated engineering docs
   fall back to GitHub blob URLs.
5. **Full-text Search** — Built-in offline search powered by Pagefind across all 35
   curated pages.
6. **Pre-1.0 Status Banner** — All pages display the pre-1.0 alpha warning banner
   and state that published releases ride non-default dist-tags.

## Commands (run from repository root)

```bash
# Render/update website/src/content/docs from docs/
bun run docs:site:sync

# Validate freshness, link integrity, and evidence separation
bun run docs:site:check

# Start local Astro development server
bun run docs:site:dev

# Build static production site (outputs to website/dist/)
bun run docs:site:build

# Preview built static site locally
bun run docs:site:preview
```

## CI Workflow

`.github/workflows/docs-site.yml` runs on every push and pull request touching
`docs/**`, `website/**`, or `tools/website/**`:
1. Regenerates API reference (`bun run docs:generate`)
2. Syncs website content (`bun run docs:site:sync`)
3. Checks site hygiene and evidence separation (`bun run docs:site:check`)
4. Builds the static site (`cd website && bun run build`)
5. Uploads static build preview artifact (`docs-site-preview`)
