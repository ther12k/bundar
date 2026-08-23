/**
 * Architecture boundary rule engine (GH-005 freeze, GH-006 harness).
 *
 * Pure functions over in-memory rules and sources so the harness in
 * tests/architecture can prove every rule fails when violated. The CLI in
 * check.ts loads the real repository through this engine.
 */
import { join } from "node:path";

export type PackageRule = {
  path: string;
  allowedBundarPackages: string[];
  allowedExternalImports: string[];
};

export type BoundaryException = {
  from: string;
  to: string;
  adr: string;
  reason: string;
  expiresWith: string;
};

export type BoundaryRules = {
  packages: Record<string, PackageRule>;
  builtinPrefixes: string[];
  rawHtmxConfinedTo: string;
  rawHtmxPatterns: string[];
  /** ADR-0018 §4 transitional exceptions; each must cite an ADR + expiry task. */
  exceptions?: BoundaryException[];
};

export type SourceFile = {
  /** Repository-relative path with forward slashes, e.g. "packages/core/src/index.ts". */
  path: string;
  source: string;
};

export type Violation = {
  file: string;
  rule: string;
  message: string;
};

const IMPORT_PATTERN =
  /(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;

export function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  return specifiers;
}

/** Maps "@bundar/htmx/2" to its owning workspace package "@bundar/htmx". */
export function owningPackage(specifier: string): string {
  if (!specifier.startsWith("@")) return specifier;
  const segments = specifier.split("/");
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : specifier;
}

function packageForPath(
  rules: BoundaryRules,
  path: string,
): [string, PackageRule] | null {
  for (const [name, rule] of Object.entries(rules.packages)) {
    if (path.startsWith(`${rule.path}/`)) return [name, rule];
  }
  return null;
}

/** Pure POSIX normalization so the engine resolves relative imports without fs access. */
function normalizePosix(path: string): string {
  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length > 0 && segments[segments.length - 1] !== "..") {
        segments.pop();
      } else {
        segments.push("..");
      }
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
}

function posixDirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "." : path.slice(0, index);
}

function resolveWithin(fromFile: string, specifier: string): string {
  return normalizePosix(`${posixDirname(fromFile)}/${specifier}`);
}

export function checkBoundaries(
  rules: BoundaryRules,
  files: readonly SourceFile[],
): Violation[] {
  const violations: Violation[] = [];

  for (const file of files) {
    const matched = packageForPath(rules, file.path);
    if (matched === null) continue; // outside framework packages (tests, fixtures, apps)
    const [packageName, rule] = matched;
    const packageRoot = rule.path;

    for (const specifier of extractImportSpecifiers(file.source)) {
      if (specifier.startsWith(".")) {
        const target = resolveWithin(file.path, specifier);
        if (target !== packageRoot && !target.startsWith(`${packageRoot}/`)) {
          violations.push({
            file: file.path,
            rule: "relative-escape",
            message:
              `${packageName}: relative import "${specifier}" in ${file.path} ` +
              `escapes the package (resolves to ${target}); remediation: import ` +
              `through the owning package's public entry instead of a relative path`,
          });
        }
        continue;
      }
      if (rules.builtinPrefixes.some((prefix) => specifier.startsWith(prefix)))
        continue;

      const imported = owningPackage(specifier);
      const isWorkspacePackage =
        specifier.startsWith("@bundar/") ||
        Object.prototype.hasOwnProperty.call(rules.packages, imported);

      if (isWorkspacePackage) {
        if (
          imported !== packageName &&
          !rule.allowedBundarPackages.includes(imported)
        ) {
          const exception = (rules.exceptions ?? []).find(
            (candidate) =>
              candidate.from === packageName && candidate.to === imported,
          );
          if (exception === undefined) {
            violations.push({
              file: file.path,
              rule: "forbidden-dependency",
              message:
                `${packageName} → ${imported}: import "${specifier}" in ${file.path} ` +
                `violates the ADR-0018 graph (allowed from ${packageName}: ` +
                `${rule.allowedBundarPackages.join(", ") || "none"}); ` +
                `remediation: remove the import, or amend the graph via a new ADR`,
            });
          }
          // Excepted edges stay visible: the CLI prints active exceptions
          // every run so transitional coupling can never go silent.
        }
        continue;
      }
      if (!rule.allowedExternalImports.includes(specifier)) {
        violations.push({
          file: file.path,
          rule: "external-dependency",
          message:
            `${packageName} → external "${specifier}" at ${file.path} is not in ` +
            `the package allowlist; remediation: declare it in the manifest ` +
            `and add it to allowedExternalImports via ADR, or drop the import`,
        });
      }
    }

    if (packageName !== rules.rawHtmxConfinedTo) {
      for (const pattern of rules.rawHtmxPatterns) {
        const match = new RegExp(pattern).exec(file.source);
        if (match !== null) {
          violations.push({
            file: file.path,
            rule: "raw-htmx-surface",
            message:
              `${packageName}: raw htmx protocol string "${match[0]}" in ` +
              `${file.path} outside ${rules.rawHtmxConfinedTo}; remediation: ` +
              `move the protocol concern into the dialect adapter boundary`,
          });
        }
      }
    }
  }

  return violations;
}

/** Declared @bundar workspace dependencies per package, from its manifest. */
export type ManifestDependencies = Record<string, readonly string[]>;

/**
 * BR-012 manifest-level checks over the ADR-0018 graph:
 *
 * - "undeclared-source-dependency": source imports a workspace package the
 *   manifest does not declare.
 * - "unused-manifest-dependency": the manifest declares a workspace
 *   dependency no source or test file imports (stale edges are public API).
 *
 * Both directions inspect actual resolved usage, so documentation drift and
 * declaration-only coupling both fail. Exceptions do NOT apply here: an
 * excepted edge still must be declared, and its usage keeps it alive.
 */
export function checkManifests(
  rules: BoundaryRules,
  manifests: ManifestDependencies,
  files: readonly SourceFile[],
): Violation[] {
  const violations: Violation[] = [];

  // Actual import edges: package name → set of imported workspace packages,
  // aggregated across src and test files of that package.
  const usage = new Map<string, Set<string>>();
  for (const file of files) {
    const matched = packageForPath(rules, file.path);
    if (matched === null) continue;
    const [packageName] = matched;
    const set = usage.get(packageName) ?? new Set<string>();
    for (const specifier of extractImportSpecifiers(file.source)) {
      if (!specifier.startsWith("@bundar/")) continue;
      const imported = owningPackage(specifier);
      if (
        imported !== packageName &&
        Object.prototype.hasOwnProperty.call(rules.packages, imported)
      ) {
        set.add(imported);
      }
    }
    usage.set(packageName, set);
  }

  for (const [name, rule] of Object.entries(rules.packages)) {
    if (!(name in manifests)) continue; // e.g. scaffolder without manifest deps
    const declared = manifests[name]!;
    const used = usage.get(name) ?? new Set<string>();

    for (const imported of used) {
      if (!declared.includes(imported)) {
        violations.push({
          file: rule.path,
          rule: "undeclared-source-dependency",
          message:
            `${name} → ${imported}: source imports "${imported}" but the ` +
            `manifest does not declare it; remediation: add the workspace ` +
            `dependency to ${rule.path}/package.json or remove the import`,
        });
      }
    }

    for (const dependency of declared) {
      if (!used.has(dependency)) {
        violations.push({
          file: join(rule.path, "package.json"),
          rule: "unused-manifest-dependency",
          message:
            `${name} → ${dependency}: manifest declares this workspace ` +
            `dependency but no source/test file imports it; remediation: ` +
            `remove the declaration or restore the import (stale edges are ` +
            `public compatibility promises)`,
        });
      }
    }
  }

  return violations;
}
