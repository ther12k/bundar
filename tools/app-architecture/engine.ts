/**
 * Application feature-boundary rule engine (BR-023).
 *
 * Pure functions over in-memory files/config so fixture tests can prove
 * every rule fires. Enforces the ADR-0019 dependency direction inside
 * Bundar APPLICATIONS (framework packages are governed separately by
 * ADR-0018's architecture:check):
 *
 *   routes → actions → domain/repository ports
 *   routes → views
 *   views  → typed read models
 *
 * Layer rules:
 *   - *.types.ts            → no app-internal or framework imports
 *   - *.repository.ts       → only its own feature's types (+ platform)
 *   - *.actions.ts          → types, repository port, schema, forms,
 *                             schema-validation packages, platform; NEVER
 *                             JSX/HTMX/kernel or any view/component file;
 *                             never `new Response(`/`new Request(`
 *   - *.view.tsx/.components.tsx → types (read models) + sibling components;
 *                             never actions/repository/kernel-HTMX
 *   - *.routes.ts / main.ts / app.ts → anything inside the app
 *   - platform/*            → framework packages allowed; never features
 *
 * Cross-feature rule: `<f>.repository.ts` is private to feature <f>.
 */

export type AppMode = "feature-sliced" | "compact";

export interface AppConfig {
  /** Application source root, e.g. "src". */
  readonly root: string;
  readonly mode: AppMode;
  /** Directory name holding feature slices (feature-sliced mode). */
  readonly featuresDir?: string;
  /** Directory name holding cross-cutting wiring. */
  readonly platformDir?: string;
  /**
   * Documented adapter exceptions: file suffix → additional allowed
   * specifiers (e.g. an actions file behind a documented transport port).
   */
  readonly allowedImports?: Readonly<Record<string, readonly string[]>>;
}

export interface AppFile {
  /** Path relative to the application repo root (posix separators). */
  readonly path: string;
  readonly source: string;
}

export interface AppViolation {
  readonly file: string;
  readonly rule: string;
  readonly message: string;
}

const IMPORT_PATTERN =
  /(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;

function importSpecifiers(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier !== undefined) out.push(specifier);
  }
  return out;
}

function posixDirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "." : path.slice(0, index);
}

function posixJoin(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}

/** Resolves relative specifiers against the importing file's directory. */
function resolveSpecifier(fromPath: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const segments: string[] = [];
  for (const part of posixJoin(posixDirname(fromPath), specifier).split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  return segments.join("/");
}

const FRAMEWORK_UI = /^@bundar\/(jsx|htmx)(\/|$)/;
const FRAMEWORK_KERNEL = /^@bundar\/core(\/|$)/;

interface FileInfo {
  readonly path: string;
  readonly layer:
    | "types"
    | "repository"
    | "actions"
    | "view"
    | "routes"
    | "platform"
    | "composition"
    | "other";
  readonly feature: string | null;
}

function classify(config: AppConfig, path: string): FileInfo | null {
  const rootPrefix = `${config.root}/`;
  if (!path.startsWith(rootPrefix)) return null;
  const rel = path.slice(rootPrefix.length);
  const base = rel.split("/").pop() ?? "";
  const platformDir = config.platformDir ?? "platform";
  const featuresDir = config.featuresDir ?? "features";

  if (config.mode === "compact") {
    if (rel.startsWith(`${platformDir}/`))
      return { path, layer: "platform", feature: null };
    if (/^app\.tsx?$/.test(base) || /^main\.tsx?$/.test(base))
      return { path, layer: "composition", feature: null };
    // Compact layout uses both bare ("types.ts") and prefixed
    // ("todos.types.ts") names.
    if (/^(\w+\.)?types\.tsx?$/.test(base))
      return { path, layer: "types", feature: null };
    if (/^(\w+\.)?repository\.tsx?$/.test(base))
      return { path, layer: "repository", feature: null };
    if (/^(\w+\.)?(actions|service)\.tsx?$/.test(base))
      return { path, layer: "actions", feature: null };
    if (
      /^(\w+\.)?(view|ui)\.tsx?$/.test(base) ||
      /\.components\.tsx$/.test(base)
    )
      return { path, layer: "view", feature: null };
    if (/^(\w+\.)?routes\.tsx?$/.test(base))
      return { path, layer: "routes", feature: null };
    return { path, layer: "other", feature: null };
  }

  if (rel.startsWith(`${platformDir}/`))
    return { path, layer: "platform", feature: null };
  if (/^(main|app|index)\.tsx?$/.test(base))
    return { path, layer: "composition", feature: null };
  if (rel.startsWith(`${featuresDir}/`)) {
    const withoutFeatures = rel.slice(featuresDir.length + 1);
    const feature = withoutFeatures.split("/")[0] ?? "";
    if (/\.(types)\.tsx?$/.test(base)) return { path, layer: "types", feature };
    if (/\.repository\.tsx?$/.test(base))
      return { path, layer: "repository", feature };
    if (/\.(actions|service)\.tsx?$/.test(base))
      return { path, layer: "actions", feature };
    if (/\.(view|components|ui)\.tsx?$/.test(base))
      return { path, layer: "view", feature };
    if (/\.routes\.tsx?$/.test(base)) return { path, layer: "routes", feature };
    return { path, layer: "other", feature };
  }
  return { path, layer: "other", feature: null };
}

function allowedExtra(
  config: AppConfig,
  path: string,
  specifier: string,
): boolean {
  const base = path.split("/").pop() ?? "";
  for (const [suffix, list] of Object.entries(config.allowedImports ?? {})) {
    if (base.endsWith(suffix) && list.includes(specifier)) return true;
  }
  return false;
}

const UI_FRAMEWORK_REASONS: ReadonlyArray<[RegExp, string]> = [
  [FRAMEWORK_UI, "UI/protocol package"],
  [FRAMEWORK_KERNEL, "kernel package"],
];

export function checkAppBoundaries(
  config: AppConfig,
  files: readonly AppFile[],
): AppViolation[] {
  const violations: AppViolation[] = [];
  const classified = files
    .map((file) => classify(config, file.path))
    .filter((info): info is FileInfo => info !== null);

  const repositoryOwners = new Map<string, string>();
  for (const info of classified) {
    if (info.layer === "repository") {
      const target = resolveSpecifier(info.path, ".");
      if (target !== null) repositoryOwners.set(target, info.feature ?? "");
    }
  }

  for (const file of files) {
    const info = classify(config, file.path);
    if (info === null) continue;
    // Test files are consumer fixtures: they may import anything an
    // application could and prove manifest usage instead.
    if (/\.test\.tsx?$/.test(file.path)) continue;
    if (info.layer === "platform" || info.layer === "composition") continue;

    // File-level checks (run regardless of imports present).
    if (
      info.layer === "actions" &&
      /\bnew\s+(Response|Request)\s*\(/.test(file.source)
    ) {
      violations.push({
        file: file.path,
        rule: "action-http-construction",
        message: `${file.path}: actions construct Request/Response directly; return domain results and let routes compose responses (documented adapter layers may allow this explicitly)`,
      });
    }

    // Cross-feature repository privacy applies to EVERY consumer layer,
    // including routes.
    for (const specifier of importSpecifiers(file.source)) {
      if (allowedExtra(config, file.path, specifier)) continue;
      const resolved = resolveSpecifier(file.path, specifier);

      if (
        resolved !== null &&
        resolved.startsWith(
          `${config.root}/${config.featuresDir ?? "features"}/`,
        ) &&
        /\.repository(\.tsx?)?$/.test(resolved)
      ) {
        const ownerFeature =
          resolved
            .slice(
              config.root.length +
                (config.featuresDir ?? "features").length +
                2,
            )
            .split("/")[0] ?? "";
        if (ownerFeature !== "" && ownerFeature !== info.feature) {
          violations.push({
            file: file.path,
            rule: "cross-feature-repository",
            message:
              `${file.path} imports another feature's private repository ` +
              `"${specifier}"; go through ${ownerFeature}'s public actions ` +
              `or types instead`,
          });
          continue;
        }
      }

      switch (info.layer) {
        case "types": {
          if (specifier.startsWith("@bundar/")) {
            violations.push({
              file: file.path,
              rule: "domain-purity",
              message: `${file.path}: domain types import "${specifier}"; keep them dependency-free`,
            });
          } else if (resolved !== null && !resolved.endsWith(".types.ts")) {
            violations.push({
              file: file.path,
              rule: "domain-purity",
              message: `${file.path}: domain types import "${specifier}"; they must be leaf modules`,
            });
          }
          break;
        }
        case "repository":
        case "actions": {
          const businessLayer = info.layer;
          for (const [pattern, label] of UI_FRAMEWORK_REASONS) {
            if (pattern.test(specifier)) {
              violations.push({
                file: file.path,
                rule:
                  businessLayer === "actions"
                    ? "action-ui-import"
                    : "domain-ui-import",
                message: `${file.path}: ${businessLayer} code imports the ${label} "${specifier}"`,
              });
            }
          }
          if (
            resolved !== null &&
            /\.(view|components|ui)(\.tsx?)?$/.test(resolved)
          ) {
            violations.push({
              file: file.path,
              rule: "business-ui-import",
              message: `${file.path}: ${businessLayer} code imports UI module "${specifier}"`,
            });
          }
          break;
        }
        case "view": {
          if (FRAMEWORK_KERNEL.test(specifier)) {
            violations.push({
              file: file.path,
              rule: "view-kernel-import",
              message: `${file.path}: views import the kernel "${specifier}"; render typed read models instead`,
            });
          }
          if (
            resolved !== null &&
            /\.(actions|service|repository)(\.tsx?)?$/.test(resolved)
          ) {
            violations.push({
              file: file.path,
              rule: "view-behavior-import",
              message: `${file.path}: views import behavior module "${specifier}"; render read models passed in by routes`,
            });
          }
          break;
        }
        default:
          break;
      }
    }
  }

  return violations.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.rule.localeCompare(b.rule) ||
      a.message.localeCompare(b.message),
  );
}
