/**
 * CLI for `bun run architecture:check` (GH-005/GH-006, BR-011/BR-012).
 *
 * Loads the frozen ADR-0018 rules from boundaries.json, scans every framework
 * package's src AND test trees through the pure engine, cross-checks package
 * manifests against actual import edges, and prints a grouped, CI-friendly
 * report. Active transitional exceptions are printed every run so coupling
 * that survives its expiry task can never go unnoticed.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  checkBoundaries,
  checkManifests,
  type BoundaryRules,
  type ManifestDependencies,
  type SourceFile,
} from "./engine";

const REPOSITORY_ROOT = join(import.meta.dir, "..", "..");
const rules = JSON.parse(
  readFileSync(join(import.meta.dir, "boundaries.json"), "utf8"),
) as BoundaryRules;

function listSourceFiles(absoluteDirectory: string): string[] {
  const files: string[] = [];
  if (!statSync(absoluteDirectory, { throwIfNoEntry: false })?.isDirectory())
    return files;
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

const sourceFiles: SourceFile[] = [];
const allFiles: SourceFile[] = [];
for (const rule of Object.values(rules.packages)) {
  for (const subdirectory of ["src", "test"]) {
    for (const absolutePath of listSourceFiles(
      join(REPOSITORY_ROOT, rule.path, subdirectory),
    )) {
      const path = relative(REPOSITORY_ROOT, absolutePath)
        .split("\\")
        .join("/");
      const entry = { path, source: readFileSync(absolutePath, "utf8") };
      allFiles.push(entry);
      // Boundary rules gate the package SURFACE (src); test trees count as
      // consumer fixtures — they prove manifest usage below but a test may
      // import any workspace package an application could.
      if (subdirectory === "src") sourceFiles.push(entry);
    }
  }
}

// Manifest-level truth: declared @bundar workspace dependencies per package.
const manifests: ManifestDependencies = {};
for (const [name, rule] of Object.entries(rules.packages)) {
  try {
    const manifest = JSON.parse(
      readFileSync(join(REPOSITORY_ROOT, rule.path, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const declared = Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.devDependencies,
    })
      .filter((dependency) => dependency.startsWith("@bundar/"))
      .map((dependency) => dependency.split("/").slice(0, 2).join("/"));
    manifests[name] = [...new Set(declared)];
  } catch {
    // Package without a manifest yet (e.g. forms before BR-013 lands).
  }
}

const violations = [
  ...checkBoundaries(rules, sourceFiles),
  ...checkManifests(rules, manifests, allFiles),
];

if (violations.length > 0) {
  const byRule = new Map<string, string[]>();
  for (const violation of violations) {
    const list = byRule.get(violation.rule) ?? [];
    list.push(`${violation.file}: ${violation.message}`);
    byRule.set(violation.rule, list);
  }
  console.error(
    `architecture:check failed with ${violations.length} violation(s) across ` +
      `${byRule.size} rule(s) (graph: ADR-0018):`,
  );
  for (const [rule, messages] of byRule) {
    console.error(`  [${rule}]`);
    for (const message of messages) {
      console.error(`    - ${message}`);
    }
  }
  process.exit(1);
}

const exceptions = rules.exceptions ?? [];
console.log(
  `architecture:check: ok (${sourceFiles.length} source files + ${allFiles.length - sourceFiles.length} test files, ` +
    `${Object.keys(rules.packages).length} package rules, ` +
    `${Object.keys(manifests).length} manifests cross-checked)`,
);
for (const exception of exceptions) {
  console.log(
    `  exception (active): ${exception.from} → ${exception.to} — ${exception.reason} ` +
      `(${exception.adr}; expires when ${exception.expiresWith} closes)`,
  );
}
