/**
 * Architecture boundary checker (GH-005, `bun run architecture:check`).
 *
 * Enforces the frozen rules from ADR-0016 / tools/architecture-check/boundaries.json:
 *   - each framework package may import only Bun/Node builtins, relative files
 *     inside itself, and the @bundar/* packages in its allowlist;
 *   - external npm packages are forbidden in framework packages (zero
 *     runtime-dependency policy and explicit-dependency rule);
 *   - raw htmx protocol strings (`HX-*` headers, `htmx:*` lifecycle event
 *     names) may appear only inside @bundar/htmx.
 *
 * GH-006 layers the adversarial test harness on top of this engine.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

type PackageRule = {
  path: string;
  allowedBundarPackages: string[];
  allowedExternalImports: string[];
};

type Boundaries = {
  packages: Record<string, PackageRule>;
  builtinPrefixes: string[];
  rawHtmxConfinedTo: string;
  rawHtmxPatterns: string[];
};

const REPOSITORY_ROOT = join(import.meta.dir, "..", "..");
const boundaries = JSON.parse(
  readFileSync(join(import.meta.dir, "boundaries.json"), "utf8"),
) as Boundaries;

const violations: string[] = [];

function listSourceFiles(absoluteDirectory: string): string[] {
  const files: string[] = [];
  if (!statSync(absoluteDirectory).isDirectory()) return files;
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absolutePath = join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(absolutePath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

const IMPORT_PATTERN =
  /(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;

function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  return specifiers;
}

/** Maps "@bundar/htmx/2" to its owning workspace package "@bundar/htmx". */
function owningPackage(specifier: string): string {
  if (!specifier.startsWith("@")) return specifier;
  const segments = specifier.split("/");
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : specifier;
}

for (const [packageName, rule] of Object.entries(boundaries.packages)) {
  const packageRoot = join(REPOSITORY_ROOT, rule.path);
  const sourceFiles = listSourceFiles(join(packageRoot, "src"));

  for (const sourceFile of sourceFiles) {
    const displayPath = relative(REPOSITORY_ROOT, sourceFile);
    const source = readFileSync(sourceFile, "utf8");

    for (const specifier of extractImportSpecifiers(source)) {
      if (specifier.startsWith(".")) {
        const resolved = resolve(sourceFile, specifier);
        if (!resolved.startsWith(packageRoot)) {
          violations.push(
            `${displayPath}: relative import "${specifier}" escapes package ${packageName}`,
          );
        }
        continue;
      }
      if (
        boundaries.builtinPrefixes.some((prefix) =>
          specifier.startsWith(prefix),
        )
      )
        continue;

      const imported = owningPackage(specifier);
      if (imported.startsWith("@bundar/") || imported === "create-bundar") {
        if (
          imported !== packageName &&
          !rule.allowedBundarPackages.includes(imported)
        ) {
          violations.push(
            `${displayPath}: package ${packageName} may not import "${specifier}" ` +
              `(allowed: ${rule.allowedBundarPackages.join(", ") || "none"})`,
          );
        }
        continue;
      }
      if (!rule.allowedExternalImports.includes(specifier)) {
        violations.push(
          `${displayPath}: external import "${specifier}" is not allowed in ${packageName} ` +
            `(framework packages declare dependencies explicitly via ADR)`,
        );
      }
    }

    if (packageName !== boundaries.rawHtmxConfinedTo) {
      for (const pattern of boundaries.rawHtmxPatterns) {
        const regex = new RegExp(pattern);
        const match = regex.exec(source);
        if (match !== null) {
          violations.push(
            `${displayPath}: raw htmx protocol string "${match[0]}" outside ` +
              `${boundaries.rawHtmxConfinedTo} (dialect adapters own htmx specifics)`,
          );
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    `architecture:check failed with ${violations.length} ${violations.length === 1 ? "violation" : "violations"} (rules: ADR-0016):`,
  );
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

console.log(
  `architecture:check: ok (${Object.keys(boundaries.packages).length} package boundary rules enforced)`,
);
