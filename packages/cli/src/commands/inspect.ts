/**
 * `bundar inspect` (BR-047): one offline command emitting a bounded,
 * deterministic project manifest for agents and tooling.
 *
 * Guarantees: no writes, no network, no secrets/environment values, fixed
 * key order (byte-stable across runs), sha256 over scanned inputs so stale
 * manifests are detectable. Route extraction is a STATIC registration scan
 * (documented best-effort); typed URLs remain authoritative via
 * `bundar routes generate`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { CommandContext, CommandDefinition } from "../cli";
import { setData, suggestNext, warn } from "../cli";
import { BUNDAR_VERSION } from "../cli";

const SCHEMA = "bundar.inspect/1";

interface PackageEntry {
  readonly name: string;
  readonly path: string;
  readonly exports: readonly string[];
  readonly private: boolean;
}

interface RouteEntry {
  readonly name: string | null;
  readonly method: string;
  readonly path: string;
}

interface FeatureEntry {
  readonly name: string;
  readonly entrypoint: string | null;
  readonly files: readonly { readonly path: string; readonly layer: string }[];
}

interface AppManifest {
  readonly path: string;
  readonly entrypoints: readonly string[];
  readonly dialect: string;
  readonly generatedFiles: readonly string[];
  readonly routes: readonly RouteEntry[];
  readonly checks: Readonly<Record<string, string>>;
  readonly features: readonly FeatureEntry[];
}

export interface InspectManifestV1 {
  readonly schema: typeof SCHEMA;
  readonly scope: "repo" | "app" | "feature";
  readonly target: string;
  readonly versions: { readonly bundar: string; readonly bun: string };
  readonly inputHash: string;
  readonly packages?: readonly PackageEntry[];
  readonly app?: AppManifest;
  readonly feature?: FeatureEntry;
}

function* walk(dir: string): Generator<string> {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* walk(path);
    } else yield path;
  }
}

function sha256Inputs(root: string, files: readonly string[]): string {
  const hasher = new Bun.CryptoHasher("sha256");
  for (const relativePath of [...files].sort()) {
    hasher.update(relativePath);
    hasher.update("\u0000");
    try {
      hasher.update(readFileSync(join(root, relativePath)));
    } catch {
      // vanished between scan and hash: record absence deterministically
      hasher.update("<missing>");
    }
    hasher.update("\u0001");
  }
  return `sha256-${hasher.digest("hex")}`;
}

function listPackages(repoRoot: string): PackageEntry[] {
  const out: PackageEntry[] = [];
  for (const dir of ["packages", "."]) {
    const base = join(repoRoot, dir);
    if (!statSync(base, { throwIfNoEntry: false })?.isDirectory()) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(base, entry.name, "package.json");
      if (!existsSync(manifestPath)) continue;
      const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        name?: string;
        private?: boolean;
        exports?: Record<string, unknown>;
      };
      if (pkg.name === undefined || !pkg.name.startsWith("@bundar/")) continue;
      out.push({
        name: pkg.name,
        path: relative(repoRoot, join(base, entry.name)).split("\\").join("/"),
        exports: Object.keys(pkg.exports ?? {}),
        private: pkg.private === true,
      });
    }
    break; // only top-level packages/ directory
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function detectDialect(appDir: string): string {
  for (const candidate of [
    join(appDir, "src/platform/dialect.ts"),
    join(appDir, "src/dialect.ts"),
  ]) {
    if (!existsSync(candidate)) continue;
    // Match the ACTUAL export statement at line start — never doc-comment
    // examples, which deliberately show both dialects.
    const source = readFileSync(candidate, "utf8").replace(
      /^\s*\/\*[\s\S]*?\*\/\s*$/gm,
      "",
    );
    const binding = source.match(/^export const dialect = (\w+)/m)?.[1];
    if (binding === "htmx4Experimental") return "htmx4-experimental";
    if (binding === "htmx2") return "htmx2";
  }
  return "unknown";
}

const REG_START =
  /\b(?:app|actions|routes)\.(get|post|put|delete)\(\s*[`'"]([^'"`]+)[`'"]/g;
const NAME_RE = /\bname:\s*["']([^"']+)["']/;

function scanRoutes(appDir: string): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const srcDir = join(appDir, "src");
  for (const absolute of walk(srcDir)) {
    if (!/\.(ts|tsx)$/.test(absolute)) continue;
    const source = readFileSync(absolute, "utf8");
    const starts = [...source.matchAll(REG_START)];
    starts.forEach((match, index) => {
      // The route's options object may sit after a long handler; scan up to
      // the next registration (or 1500 chars) for its stable name.
      const segmentEnd =
        index + 1 < starts.length
          ? starts[index + 1]!.index
          : Math.min(source.length, match.index! + 1500);
      const segment = source.slice(match.index!, segmentEnd);
      routes.push({
        method: match[1]!.toUpperCase(),
        path: match[2]!,
        name: segment.match(NAME_RE)?.[1] ?? null,
      });
    });
  }
  return routes.sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
}

const GENERATED_SUFFIXES = ["routes.gen.ts"];

function generatedFiles(appDir: string): string[] {
  return GENERATED_SUFFIXES.flatMap((suffix) =>
    existsSync(join(appDir, "src", suffix)) ? [`src/${suffix}`] : [],
  );
}

function checksOf(appDir: string): Record<string, string> {
  const manifestPath = join(appDir, "package.json");
  if (!existsSync(manifestPath)) return {};
  const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const wanted = ["test", "typecheck", "app:arch", "routes:check"];
  const out: Record<string, string> = {};
  for (const key of wanted) {
    if (pkg.scripts?.[key] !== undefined) out[key] = pkg.scripts[key]!;
  }
  return out;
}

function layerOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  if (/AGENTS\.md$/.test(base)) return "map";
  if (/\.routes\.tsx?$/.test(base)) return "routes";
  if (/\.view\.tsx$/.test(base)) return "view";
  if (/\.components\.tsx$/.test(base)) return "components";
  if (/\.(actions|service)\.tsx?$/.test(base)) return "actions";
  if (/\.schema\.tsx?$/.test(base)) return "schema";
  if (/\.types\.tsx?$/.test(base)) return "types";
  if (/\.repository\.tsx?$/.test(base)) return "repository";
  return "other";
}

function featuresOf(appDir: string): FeatureEntry[] {
  const featuresDir = join(appDir, "src/features");
  if (!statSync(featuresDir, { throwIfNoEntry: false })?.isDirectory())
    return [];
  const out: FeatureEntry[] = [];
  for (const entry of readdirSync(featuresDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(featuresDir, entry.name);
    const files = [...walk(dir)]
      .map((absolute) => relative(appDir, absolute).split("\\").join("/"))
      .sort();
    const entrypoint = files.find((f) => /\.routes\.(ts|tsx)$/.test(f)) ?? null;
    out.push({
      name: entry.name,
      entrypoint,
      files: files.map((path) => ({ path, layer: layerOf(path) })),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function entrypointsOf(appDir: string): string[] {
  return ["src/main.ts", "src/app.ts"].filter((f) =>
    existsSync(join(appDir, f)),
  );
}

const KNOWN_APPS = [
  "examples/todo",
  "examples/admin-crud",
  "templates/minimal",
];

export async function runInspect(ctx: CommandContext): Promise<number> {
  const repoRoot =
    ctx.flags["root"] !== undefined && typeof ctx.flags["root"] === "string"
      ? (ctx.flags["root"] as string).startsWith("/")
        ? (ctx.flags["root"] as string)
        : join(process.cwd(), ctx.flags["root"] as string)
      : process.cwd();

  const scope = (
    typeof ctx.flags["scope"] === "string"
      ? (ctx.flags["scope"] as string)
      : ctx.flags["feature"] !== undefined
        ? "feature"
        : ctx.flags["app"] !== undefined
          ? "app"
          : "repo"
  ) as "repo" | "app" | "feature";

  let appDir: string | null = null;
  if (ctx.flags["app"] !== undefined && typeof ctx.flags["app"] === "string") {
    appDir = join(repoRoot, ctx.flags["app"]);
  } else if (scope !== "repo") {
    // nearest ancestor with src/main.ts
    let cursor = process.cwd();
    while (cursor.startsWith(repoRoot)) {
      if (existsSync(join(cursor, "src/main.ts"))) {
        appDir = cursor;
        break;
      }
      const parent = join(cursor, "..");
      if (parent === cursor) break;
      cursor = parent;
    }
  }
  if (scope !== "repo" && (appDir === null || !existsSync(appDir))) {
    warn("no application directory resolved; pass --app <dir>");
    return 1;
  }

  const versions = {
    bundar: BUNDAR_VERSION,
    bun: typeof Bun !== "undefined" ? (Bun.version ?? "unknown") : "unknown",
  };

  if (scope === "repo") {
    const scanned: string[] = [];
    for (const pkg of ["package.json", "bun.lock"]) {
      if (existsSync(join(repoRoot, pkg))) scanned.push(pkg);
    }
    for (const app of KNOWN_APPS.filter((a) => existsSync(join(repoRoot, a)))) {
      for (const absolute of walk(join(repoRoot, app)))
        scanned.push(relative(repoRoot, absolute).split("\\").join("/"));
    }
    const manifest: InspectManifestV1 = {
      schema: SCHEMA,
      scope,
      target: "repository",
      versions,
      inputHash: sha256Inputs(repoRoot, scanned),
      packages: listPackages(repoRoot),
    };
    setData(manifest);
    suggestNext("bundar inspect --scope app --app examples/todo");
    if (!ctx.json) {
      console.log(
        `inspect: ${manifest.packages!.length} packages, input ${manifest.inputHash.slice(0, 18)}…`,
      );
    }
    return 0;
  }

  const app: AppManifest = {
    path: relative(repoRoot, appDir!).split("\\").join("/"),
    entrypoints: entrypointsOf(appDir!),
    dialect: detectDialect(appDir!),
    generatedFiles: generatedFiles(appDir!),
    routes: scanRoutes(appDir!),
    checks: checksOf(appDir!),
    features: featuresOf(appDir!),
  };

  const featureName =
    typeof ctx.flags["feature"] === "string"
      ? (ctx.flags["feature"] as string)
      : undefined;

  const scanned = [...walk(appDir!)].map((absolute) =>
    relative(appDir!, absolute).split("\\").join("/"),
  );

  if (scope === "app") {
    const manifest: InspectManifestV1 = {
      schema: SCHEMA,
      scope,
      target: app.path,
      versions,
      inputHash: sha256Inputs(appDir!, scanned),
      app,
    };
    setData(manifest);
    suggestNext(
      `bundar inspect --scope feature --app ${app.path} --feature ${app.features[0]?.name ?? ""}`,
    );
    if (!ctx.json) {
      console.log(
        `inspect: ${app.path} dialect=${app.dialect} routes=${app.routes.length} features=${app.features.length}`,
      );
    }
    return 0;
  }

  const feature = app.features.find((f) => f.name === featureName);
  if (feature === undefined) {
    warn(
      `unknown feature ${JSON.stringify(featureName)} (known: ${app.features.map((f) => f.name).join(", ")})`,
    );
    return 1;
  }

  const featureFiles = feature.files.map((f) => f.path);
  const manifest: InspectManifestV1 = {
    schema: SCHEMA,
    scope,
    target: `${app.path}#features/${feature.name}`,
    versions,
    inputHash: sha256Inputs(appDir!, featureFiles),
    feature,
  };
  setData(manifest);
  if (!ctx.json) {
    console.log(
      `inspect: feature ${feature.name}, ${feature.files.length} files, entry ${feature.entrypoint ?? "?"}`,
    );
  }
  return 0;
}

export const inspectCommand: CommandDefinition = {
  name: "inspect",
  description:
    "Emit a bounded offline project manifest (repo/app/feature scopes)",
  handler: runInspect,
};
