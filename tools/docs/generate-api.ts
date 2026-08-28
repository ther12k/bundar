/**
 * API reference extractor (GH-079): renders every public package's
 * surface — runtime exports (live import) and type-only exports (source
 * scan) — into docs/api/<package>.md with one navigation index listing
 * every export exactly once. Experimental dialect surfaces are marked
 * from adapter maturity data, never hand-maintained.
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..");
const DOCS_API = join(REPO, "docs", "api");

interface PackageSpec {
  readonly id: string;
  readonly module: string;
  readonly source: string;
  readonly blurb: string;
}

const PACKAGES: readonly PackageSpec[] = [
  {
    id: "core",
    module: "@bundar/core",
    source: "packages/core/src/index.ts",
    blurb:
      "Routing, context, middleware, errors, budgets — zero runtime dependencies.",
  },
  {
    id: "jsx",
    module: "@bundar/jsx",
    source: "packages/jsx/src/index.ts",
    blurb:
      "Server-only JSX rendering and streaming — zero runtime dependencies.",
  },
  {
    id: "schema",
    module: "@bundar/schema",
    source: "packages/schema/src/index.ts",
    blurb: "Standard Schema validation adapter and field-error models.",
  },
  {
    id: "forms",
    module: "@bundar/forms",
    source: "packages/forms/src/index.ts",
    blurb:
      "Progressive-form workflow contracts — parsing orchestration, retained values, action composition (skeleton).",
  },
  {
    id: "security",
    module: "@bundar/security",
    source: "packages/security/src/index.ts",
    blurb: "CSRF, sessions, flash, security headers/CSP.",
  },
  {
    id: "htmx",
    module: "@bundar/htmx",
    source: "packages/htmx/src/index.ts",
    blurb: "Dialect negotiation, actions, updates, events, assets.",
  },
  {
    id: "testing",
    module: "@bundar/testing",
    source: "packages/testing/src/index.ts",
    blurb: "In-process test client and request helpers.",
  },
  {
    id: "cli",
    module: "@bundar/cli",
    source: "packages/cli/src/index.ts",
    blurb: "The bundar command-line interface.",
  },
];

function typeOnlyExports(source: string): string[] {
  const blocks = source.match(/export type \{[^}]*\}/g) ?? [];
  return blocks
    .flatMap((block) =>
      block
        .replace("export type {", "")
        .replace("}", "")
        .split(",")
        .map((name) => name.trim().split(" as ")[0]!.trim())
        .filter((name) => name.length > 0),
    )
    .sort();
}

/** maturity markers derived from the experimental adapter's own data */
async function dialectMaturity(): Promise<string> {
  try {
    const { htmx4Experimental } = await import("@bundar/htmx/4");
    const asset = htmx4Experimental.describeAsset();
    return [
      `> ⚠️ **Experimental** — the htmx 4 beta adapter (\`@bundar/htmx/4\`, ${asset.version}, integrity \`${(asset.integrity ?? "").slice(0, 19)}…\`) is \`maturity: ${htmx4Experimental.maturity}\`. No GA compatibility claim. Cross-reference: [compatibility matrix](../compatibility/matrix.md).`,
    ].join("\n");
  } catch {
    return "";
  }
}

async function renderPackage(spec: PackageSpec): Promise<string> {
  const module = await import(spec.module);
  const runtime = Object.keys(module).sort();
  const source = readFileSync(join(REPO, spec.source), "utf8");
  const types = typeOnlyExports(source);

  const lines: string[] = [];
  lines.push(`# @bundar/${spec.id === "cli" ? "cli" : spec.id} API reference`);
  lines.push("");
  lines.push(
    `<sub>Generated from the live public surface by \`bun run docs:generate\` . Drift fails the build — regenerate and commit together with the source change.</sub>`,
  );
  lines.push("");
  lines.push(spec.blurb);
  lines.push("");
  if (spec.id === "htmx") {
    lines.push(await dialectMaturity());
    lines.push("");
  }
  lines.push(`## Runtime exports (${runtime.length})`);
  lines.push("");
  for (const name of runtime) {
    lines.push(`- \`${name}\``);
  }
  lines.push("");
  lines.push(`## Type exports (${types.length})`);
  lines.push("");
  if (types.length === 0) {
    lines.push("_none_");
  } else {
    for (const name of types) {
      lines.push(`- \`${name}\``);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export interface GenerationResult {
  readonly filesWritten: number;
  readonly exportsIndexed: number;
  readonly changed: readonly string[];
}

/** Regenerates docs/api/*. Returns which files changed (for drift gates). */
export async function generateApiDocs(): Promise<GenerationResult> {
  mkdirSync(DOCS_API, { recursive: true });
  const changed: string[] = [];
  let filesWritten = 0;
  let exportsIndexed = 0;
  const indexRows: string[] = [];

  for (const spec of PACKAGES) {
    const rendered = await renderPackage(spec);
    const target = join(DOCS_API, `${spec.id}.md`);
    const before = existsSync(target) ? readFileSync(target, "utf8") : "";
    if (before !== rendered) changed.push(`docs/api/${spec.id}.md`);
    writeFileSync(target, rendered);
    filesWritten += 1;
    const module = await import(spec.module);
    const types = typeOnlyExports(
      readFileSync(join(REPO, spec.source), "utf8"),
    );
    exportsIndexed += Object.keys(module).length + types.length;
    indexRows.push(
      `| [@bundar/${spec.id}](./${spec.id}.md) | ${Object.keys(module).length} | ${types.length} |`,
    );
  }

  const index = [
    "# API reference",
    "",
    "<sub>Generated by `bun run docs:generate` — every public export appears exactly once in navigation. Drift fails the build.</sub>",
    "",
    "| Package | Runtime exports | Type exports |",
    "| --- | ---: | ---: |",
    ...indexRows,
    "",
    "Topic deep-dives: [compatibility matrix](../compatibility/matrix.md), [htmx 2 profile](../compatibility/htmx2.md), [htmx 4 beta profile](../compatibility/htmx4-beta6.md), [guides](../guides/README.md).",
    "",
  ].join("\n");
  const indexPath = join(DOCS_API, "README.md");
  const indexBefore = existsSync(indexPath)
    ? readFileSync(indexPath, "utf8")
    : "";
  if (indexBefore !== index) changed.push("docs/api/README.md");
  writeFileSync(indexPath, index);

  return { filesWritten: filesWritten + 1, exportsIndexed, changed };
}

/** CLI entry: write files; exit 1 when anything changed (drift gate). */
if (import.meta.main) {
  const result = await generateApiDocs();
  console.log(
    `docs:generate: ${result.filesWritten} files, ${result.exportsIndexed} exports indexed`,
  );
  const check = process.argv.includes("--check");
  if (check && result.changed.length > 0) {
    console.error(
      `docs:generate: drift detected in ${result.changed.join(", ")} — regenerate and commit`,
    );
    process.exit(1);
  }
  void readdirSync;
}
