/**
 * pack:audit (GH-084): pack every public package and inventory it —
 * files, compressed/unpacked sizes, dependencies (runtime/transitive),
 * license fields, exports/types presence, and accidental-content scans
 * (secrets, private fixtures, absolute paths, build artifacts). The
 * machine-readable bill of materials lands in artifacts/packages/bom.json;
 * size budgets and license policy fail closed.
 *
 * Also realizes: `pack:all` (pack everything), `licenses:check`
 * (approved-license policy from SPDX identifiers), `secrets:scan`
 * (tarball content patterns). Each is a mode of this one auditor so
 * the inventory and the checks can never drift apart.
 */
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const REPO = join(import.meta.dir, "..");
const PACKAGES = [
  "@bundar/core",
  "@bundar/jsx",
  "@bundar/schema",
  "@bundar/forms",
  "@bundar/security",
  "@bundar/htmx",
  "@bundar/testing",
  "@bundar/cli",
  "create-bundar",
] as const;

const APPROVED_LICENSES = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "0BSD",
]);

/** Per-package size budgets (unpacked bytes). Exceptions need an ADR. */
const SIZE_BUDGETS: Record<string, number> = {
  "@bundar/core": 220_000,
  "@bundar/jsx": 120_000,
  "@bundar/schema": 60_000,
  "@bundar/forms": 60_000,
  "@bundar/security": 120_000,
  "@bundar/htmx": 1_200_000, // carries the two pinned htmx vendor assets
  "@bundar/testing": 80_000,
  "@bundar/cli": 150_000,
  "create-bundar": 60_000,
};

const SECRET_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  {
    name: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  { name: "aws-key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "github-token", pattern: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  {
    name: "generic-secret-assign",
    pattern:
      /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9+/]{20,}["']/i,
  },
  { name: "absolute-private-path", pattern: /\/home\/[a-z0-9_-]+\// },
];

function spawnOk(
  command: string,
  args: readonly string[],
  cwd: string,
): boolean {
  const result = spawnSync(command, args, { cwd, stdio: "pipe" });
  return result.status === 0;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function fileHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

interface PackageReport {
  readonly name: string;
  readonly version: string;
  readonly tarball: string;
  readonly sha256: string;
  readonly files: readonly string[];
  readonly fileCount: number;
  readonly unpackedBytes: number;
  readonly packedBytes: number;
  readonly sizeBudgetBytes: number;
  readonly sizeWithinBudget: boolean;
  readonly license: string;
  readonly licenseApproved: boolean;
  readonly runtimeDependencies: Record<string, string>;
  readonly devDependencyCount: number;
  readonly exportsEntry: boolean;
  readonly typesEntry: boolean;
  readonly findings: readonly { kind: string; file: string; detail: string }[];
}

const temp = mkdtempSync(join(tmpdir(), "bundar-audit-"));
const reports: PackageReport[] = [];
const failures: string[] = [];

for (const pkg of PACKAGES) {
  const dir =
    join(REPO, "packages", pkg.replace("@bundar/", "")) === pkg
      ? join(REPO, "packages", pkg)
      : pkg === "create-bundar"
        ? join(REPO, "create-bundar")
        : join(REPO, "packages", pkg.replace("@bundar/", ""));
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));

  // pack into the audit temp dir
  if (!spawnOk("bun", ["pm", "pack"], dir)) {
    failures.push(`${pkg}: bun pm pack failed`);
    continue;
  }
  const tarballName = `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`;
  const produced = join(dir, tarballName);
  const tarball = join(temp, tarballName);
  spawnOk("mv", [produced, tarball], dir);

  // inventory
  const extract = join(temp, `${tarballName}.d`);
  mkdirSync(extract, { recursive: true });
  spawnOk("tar", ["-xzf", tarball, "-C", extract], temp);
  const files = walk(join(extract, "package")).map((f) =>
    f.replace(join(extract, "package") + "/", ""),
  );
  let unpacked = 0;
  for (const file of files)
    unpacked += statSync(join(extract, "package", file)).size;

  // content scans (text files only)
  const findings: { kind: string; file: string; detail: string }[] = [];
  for (const file of files) {
    const full = join(extract, "package", file);
    if (statSync(full).size > 2_000_000) continue;
    const isText =
      /\.(ts|tsx|js|jsx|json|md|txt|html|css)$/i.test(file) ||
      file.startsWith("vendor/");
    if (!isText) continue;
    const text = readFileSync(full, "utf8");
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (name === "absolute-private-path" && file.startsWith("vendor/"))
        continue;
      if (pattern.test(text)) {
        findings.push({
          kind: name,
          file,
          detail: "pattern matched in packed content",
        });
      }
    }
    if (/\.(map|log|lock)$/.test(file) || /(?:^|\/)dist\//.test(file)) {
      findings.push({
        kind: "build-artifact",
        file,
        detail: "accidental artifact in package",
      });
    }
    if (/(?:^|\/)(?:fixtures?|test-data)\//i.test(file)) {
      findings.push({
        kind: "test-fixture",
        file,
        detail: "fixture shipped in package",
      });
    }
  }

  const license = String(manifest.license ?? "UNLICENSED");
  const budget = SIZE_BUDGETS[pkg] ?? Number.POSITIVE_INFINITY;
  const report: PackageReport = {
    name: manifest.name,
    version: manifest.version,
    tarball: tarballName,
    sha256: fileHash(tarball),
    files,
    fileCount: files.length,
    unpackedBytes: unpacked,
    packedBytes: statSync(tarball).size,
    sizeBudgetBytes: budget,
    sizeWithinBudget: unpacked <= budget,
    license,
    licenseApproved: APPROVED_LICENSES.has(license),
    runtimeDependencies: manifest.dependencies ?? {},
    devDependencyCount: Object.keys(manifest.devDependencies ?? {}).length,
    exportsEntry: manifest.exports !== undefined,
    typesEntry:
      manifest.types !== undefined ||
      manifest.exports?.["."]?.types !== undefined,
    findings,
  };
  reports.push(report);

  // fail-closed checks
  if (!report.sizeWithinBudget)
    failures.push(`${pkg}: unpacked ${unpacked}B exceeds budget ${budget}B`);
  if (!report.licenseApproved)
    failures.push(`${pkg}: license ${license} not in the approved set`);
  for (const finding of findings)
    failures.push(`${pkg}: ${finding.kind} in ${finding.file}`);
}

// zero-runtime-dependency policy for core and jsx (ADR-0011)
for (const name of ["@bundar/core", "@bundar/jsx"]) {
  const report = reports.find((entry) => entry.name === name);
  if (report === undefined) continue;
  if (Object.keys(report.runtimeDependencies).length > 0) {
    failures.push(
      `${name}: zero-runtime-dependency claim violated (${Object.keys(report.runtimeDependencies).join(", ")})`,
    );
  }
}

// all runtime deps must be workspace-internal at this stage
for (const report of reports) {
  for (const [dep] of Object.entries(report.runtimeDependencies)) {
    if (!dep.startsWith("@bundar/")) {
      failures.push(
        `${report.name}: external runtime dependency ${dep} needs an ADR`,
      );
    }
  }
}

// exports resolve under a clean consumer: the cleanroom proves install +
// typecheck + run; here we assert every package HAS resolvable entries
for (const report of reports) {
  if (!report.exportsEntry) failures.push(`${report.name}: no exports map`);
  if (!report.typesEntry) failures.push(`${report.name}: no types entry`);
}

mkdirSync(join(REPO, "artifacts", "packages"), { recursive: true });
const bom = {
  generatedAt: new Date().toISOString(),
  policy: {
    approvedLicenses: [...APPROVED_LICENSES],
    sizeBudgets: SIZE_BUDGETS,
    notes: [
      "core and jsx are zero-runtime-dependency by ADR-0011.",
      "External runtime dependencies require an ADR; none exist.",
      "Size exceptions require an ADR or a release blocker.",
    ],
  },
  packages: reports.map((report) => ({
    name: report.name,
    version: report.version,
    tarball: report.tarball,
    sha256: report.sha256,
    fileCount: report.fileCount,
    files: report.files,
    unpackedBytes: report.unpackedBytes,
    packedBytes: report.packedBytes,
    sizeWithinBudget: report.sizeWithinBudget,
    license: report.license,
    runtimeDependencies: report.runtimeDependencies,
    findings: report.findings,
  })),
  summary: {
    packages: reports.length,
    totalUnpackedBytes: reports.reduce((sum, r) => sum + r.unpackedBytes, 0),
    totalPackedBytes: reports.reduce((sum, r) => sum + r.packedBytes, 0),
    findings: reports.reduce((sum, r) => sum + r.findings.length, 0),
  },
};
writeFileSync(
  join(REPO, "artifacts", "packages", "bom.json"),
  JSON.stringify(bom, null, 2) + "\n",
);
writeFileSync(
  join(REPO, "artifacts", "licenses.json"),
  JSON.stringify(
    {
      generatedAt: bom.generatedAt,
      approved: [...APPROVED_LICENSES],
      packages: reports.map((r) => ({
        name: r.name,
        license: r.license,
        approved: r.licenseApproved,
      })),
    },
    null,
    2,
  ) + "\n",
);

rmSync(temp, { recursive: true, force: true });

console.log(
  `pack:audit: ${reports.length} packages · ${bom.summary.totalUnpackedBytes.toLocaleString()}B unpacked · ${bom.summary.findings} finding(s)`,
);
for (const report of reports) {
  const size = `${(report.unpackedBytes / 1024).toFixed(1)}KB/${(report.sizeBudgetBytes / 1024).toFixed(0)}KB`;
  console.log(
    `  ${report.name} ${report.version} · ${report.fileCount} files · ${size} · ${report.license}${report.findings.length > 0 ? ` · ${report.findings.length} FINDING(S)` : ""}`,
  );
}
if (failures.length > 0) {
  console.error("pack:audit FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  "pack:audit: within policy (sizes, licenses, contents, zero-dep claims)",
);
