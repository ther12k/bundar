/**
 * Governance document checker (GH-002).
 *
 * Implements `bun run docs:check`: verifies the presence and internal
 * consistency of governance, licensing, and security documents, including
 * license identity across every workspace manifest and the absence of issue
 * templates that would encourage public vulnerability disclosure.
 * Fails with exit code 1 and a complete list of problems.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");
const problems: string[] = [];

function readRequiredFile(relativePath: string): string | null {
  const absolutePath = join(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    problems.push(`missing required file: ${relativePath}`);
    return null;
  }
  return readFileSync(absolutePath, "utf8");
}

// --- 1. Required governance files -----------------------------------------

const requiredFiles = [
  "LICENSE",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  "MAINTAINERS.md",
  ".github/CODEOWNERS",
];

for (const file of requiredFiles) {
  readRequiredFile(file);
}

// --- 2. License identity matches package metadata --------------------------

const license = readRequiredFile("LICENSE");
if (license !== null && !license.includes("MIT License")) {
  problems.push(
    "LICENSE does not declare the MIT License approved by project/open-source-strategy.md",
  );
}

type PackageManifest = { name?: string; license?: string };

function readManifest(relativeDirectory: string): PackageManifest | null {
  const relativePath = join(relativeDirectory, "package.json");
  const content = readRequiredFile(relativePath);
  if (content === null) return null;
  try {
    return JSON.parse(content) as PackageManifest;
  } catch {
    problems.push(`invalid JSON in ${relativePath}`);
    return null;
  }
}

function workspaceDirectories(parent: string): string[] {
  const absoluteParent = join(repositoryRoot, parent);
  if (!existsSync(absoluteParent)) return [];
  return readdirSync(absoluteParent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(parent, entry.name));
}

const manifestDirectories = [
  ".",
  ...workspaceDirectories("packages"),
  "create-bundar",
  ...workspaceDirectories("examples"),
];

for (const directory of manifestDirectories) {
  const manifest = readManifest(directory);
  if (manifest === null) continue;
  if (manifest.license !== "MIT") {
    const label = manifest.name ?? join(directory, "package.json");
    problems.push(
      `${label} must declare "license": "MIT" to match the repository LICENSE`,
    );
  }
}

// --- 3. Security policy has a private path, no public disclosure template ---

const security = readRequiredFile("SECURITY.md");
if (security !== null) {
  if (!/private/i.test(security)) {
    problems.push("SECURITY.md must describe a private reporting path");
  }
  if (!/Security Advisories|Report\s+a\s+vulnerability/i.test(security)) {
    problems.push(
      "SECURITY.md must reference GitHub private vulnerability reporting",
    );
  }
}

const issueTemplateDirectory = join(
  repositoryRoot,
  ".github",
  "ISSUE_TEMPLATE",
);
if (existsSync(issueTemplateDirectory)) {
  const templateFiles = readdirSync(issueTemplateDirectory, {
    withFileTypes: true,
  })
    .filter(
      (entry) => entry.isFile() && /\.(md|yml|yaml)$/.test(extname(entry.name)),
    )
    .map((entry) => join(".github", "ISSUE_TEMPLATE", entry.name));
  for (const template of templateFiles) {
    const content = readFileSync(join(repositoryRoot, template), "utf8");
    if (/vulnerab|exploit|zero-day/i.test(content)) {
      problems.push(
        `${template} discusses vulnerabilities; security reports must stay private (SECURITY.md)`,
      );
    }
  }
}

// --- 4. Contribution guide requires evidence and links the OKF corpus ------

const contributing = readRequiredFile("CONTRIBUTING.md");
if (contributing !== null) {
  if (!/evidence/i.test(contributing)) {
    problems.push("CONTRIBUTING.md must require evidence for changes");
  }
  const okfReferences = [
    "issues/",
    "MASTER_AGENT_PROMPT.md",
    "docs/okf",
  ].filter((reference) => contributing.includes(reference));
  if (okfReferences.length === 0) {
    problems.push("CONTRIBUTING.md must link the OKF corpus or issue backlog");
  }

  const relativeLinkPattern = /\]\(([^)#?]+?)(?:#[^)]*)?\)/g;
  for (const match of contributing.matchAll(relativeLinkPattern)) {
    const target = match[1];
    if (target === undefined) continue;
    if (/^(https?:|mailto:|\/)/.test(target)) continue;
    if (!existsSync(join(repositoryRoot, target))) {
      problems.push(`CONTRIBUTING.md links to a missing file: ${target}`);
    }
  }
}

// --- 5. CODEOWNERS covers security and release paths -----------------------

const codeowners = readRequiredFile(".github/CODEOWNERS");
if (codeowners !== null) {
  const requiredOwnerships = [
    "/packages/jsx/",
    "/packages/htmx/",
    "/.github/workflows/",
  ];
  for (const ownership of requiredOwnerships) {
    if (!codeowners.includes(ownership)) {
      problems.push(`CODEOWNERS must assign review ownership for ${ownership}`);
    }
  }
}

// --- Result ----------------------------------------------------------------

if (problems.length > 0) {
  console.error(
    `docs:check failed with ${problems.length} ${problems.length === 1 ? "problem" : "problems"}:`,
  );
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

console.log(
  `docs:check: ok (${requiredFiles.length} governance files, ${manifestDirectories.length} manifests verified)`,
);
