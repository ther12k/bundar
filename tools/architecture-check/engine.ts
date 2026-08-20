/**
 * Architecture boundary rule engine (GH-005 freeze, GH-006 harness).
 *
 * Pure functions over in-memory rules and sources so the harness in
 * tests/architecture can prove every rule fails when violated. The CLI in
 * check.ts loads the real repository through this engine.
 */
export type PackageRule = {
  path: string;
  allowedBundarPackages: string[];
  allowedExternalImports: string[];
};

export type BoundaryRules = {
  packages: Record<string, PackageRule>;
  builtinPrefixes: string[];
  rawHtmxConfinedTo: string;
  rawHtmxPatterns: string[];
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
            message: `relative import "${specifier}" escapes package ${packageName} (resolves to ${target})`,
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
          violations.push({
            file: file.path,
            rule: "forbidden-dependency",
            message: `package ${packageName} may not import "${specifier}" (allowed: ${
              rule.allowedBundarPackages.join(", ") || "none"
            })`,
          });
        }
        continue;
      }
      if (!rule.allowedExternalImports.includes(specifier)) {
        violations.push({
          file: file.path,
          rule: "external-dependency",
          message: `external import "${specifier}" is not allowed in ${packageName}; framework packages declare dependencies explicitly via ADR`,
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
            message: `raw htmx protocol string "${match[0]}" outside ${rules.rawHtmxConfinedTo}; dialect adapters own htmx specifics`,
          });
        }
      }
    }
  }

  return violations;
}
