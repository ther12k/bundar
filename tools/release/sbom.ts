/**
 * release:sbom (GH-085): a CycloneDX 1.5 JSON SBOM covering the eight
 * release packages (from the GH-084 audited BOM) plus every direct and
 * transitive dependency resolved by bun.lock — runtime (workspace-
 * internal at alpha) and build/dev (typescript, eslint, hono parity
 * fixture, validators, yaml, prettier).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const REPO = join(import.meta.dir, "..", "..");
const bom = JSON.parse(
  readFileSync(join(REPO, "artifacts", "packages", "bom.json"), "utf8"),
);
const lock = readFileSync(join(REPO, "bun.lock"), "utf8");
// bun.lock is JSONC (leading // comments) — strip them before parsing
const lockJson = lock
  .split("\n")
  .filter((line) => !/^\s*\/\//.test(line))
  .join("\n")
  .replace(/,(\s*[\]}])/g, "$1"); // JSONC trailing commas
const lockParsed = JSON.parse(lockJson) as {
  workspaces?: Record<string, { name?: string; version?: string }>;
  packages?: Record<string, string[]>;
};
const rootPkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));

function purl(name: string, version: string): string {
  return `pkg:npm/${name.replace("@", "%40").replace("/", "/")}@${version}`;
}

// ---- workspace components (the release packages themselves) ----
const components = bom.packages.map(
  (pkg: {
    name: string;
    version: string;
    sha256: string;
    license: string;
  }) => ({
    type: "library",
    "bom-ref": `pkg:npm/${pkg.name}@${pkg.version}`,
    name: pkg.name,
    version: pkg.version,
    licenses: [{ license: { id: pkg.license } }],
    hashes: [{ alg: "SHA-256", content: pkg.sha256 }],
    purl: purl(pkg.name, pkg.version),
  }),
);

// ---- external dependencies from the lock (direct + transitive) ----
// lock "packages" maps name → ["name@version", ...]; the array entries
// carry the resolved versions for every transitive dependency
const externals = new Map<string, string>();
for (const specs of Object.values(lockParsed.packages ?? {})) {
  for (const spec of specs ?? []) {
    if (typeof spec !== "string") continue;
    const at = spec.lastIndexOf("@");
    if (at <= 0) continue;
    externals.set(spec.slice(0, at), spec.slice(at + 1));
  }
}
for (const [name, version] of externals) {
  components.push({
    type: "library",
    "bom-ref": purl(name, version),
    name,
    version,
    purl: purl(name, version),
  });
}

// ---- dependency graph: packages → their workspace deps + root dev deps ----
const dependencies = bom.packages.map(
  (pkg: {
    name: string;
    version: string;
    runtimeDependencies: Record<string, string>;
  }) => ({
    ref: purl(pkg.name, pkg.version),
    dependsOn: Object.keys(pkg.runtimeDependencies ?? {})
      .filter((dep) =>
        bom.packages.some((p: { name: string }) => p.name === dep),
      )
      .map((dep) => {
        const target = bom.packages.find(
          (p: { name: string }) => p.name === dep,
        );
        return purl(dep, target.version);
      }),
  }),
);
// root build dependencies (declared devDependencies, resolved by lock)
dependencies.push({
  ref: "pkg:npm/bundar-root@0.0.0",
  dependsOn: Object.keys(rootPkg.devDependencies ?? {})
    .filter((name) => externals.has(name))
    .map((name) => [...externals].find(([n]) => n === name)!)
    .map(([name, version]) => purl(name, version)),
});

const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  serialNumber: `urn:uuid:${crypto.randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      type: "application",
      name: "bundar",
      version: rootPkg.version,
    },
    tools: [{ vendor: "bundar", name: "release:sbom", version: "1.0.0" }],
    properties: [
      {
        name: "bundar:lockfile:sha256",
        value: createHash("sha256").update(lock).digest("hex"),
      },
      {
        name: "bundar:scope",
        value:
          "source+packages: 8 workspace release packages + lock-resolved externals (runtime+build)",
      },
    ],
  },
  components,
  dependencies,
};

mkdirSync(join(REPO, "artifacts", "sbom"), { recursive: true });
writeFileSync(
  join(REPO, "artifacts", "sbom", "sbom.json"),
  JSON.stringify(sbom, null, 2) + "\n",
);
console.log(
  `release:sbom: ${components.length} components (${bom.packages.length} release packages + ${components.length - bom.packages.length} lock-resolved externals), ${dependencies.length} dependency nodes`,
);
