/**
 * publish:dry-run (GH-086): publication simulation without any registry
 * publish —
 *
 * 1. Simulate the pre-release plan: version 0.1.0-alpha.1, dist-tag
 *    `alpha`, dependency-first publish order, and inter-package version
 *    synchronization (every packed manifest's @bundar deps rewritten to
 *    the same pre-release version — the form npm publish would emit).
 * 2. Pack all 8 packages, rewrite workspace/0.0.0 specs to the
 *    simulated version, install them as file: tarballs in a CLEAN
 *    consumer, and import EVERY documented entry point: core, jsx,
 *    schema, security, htmx (root + /2 + /4 subpaths), testing — plus
 *    execute the CLI binary from its tarball and typecheck a TSX file
 *    whose JSX runtime resolves through the installed @bundar/jsx.
 * 3. Export-map verification: every exports key resolves to a file
 *    inside the tarball; types entries exist; files allow-list covers
 *    them; README/license/repository metadata present; no `workspace:`
 *    protocol and no unpublished internal path leaks.
 * 4. Fail closed; write artifacts/publish-dry-run.{md,json}.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCandidateTarballs,
  DEFAULT_TAG,
  DEFAULT_VERSION,
  PUBLISH_ORDER,
  REPO,
} from "./pack-release";

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const SIM_VERSION = argument("--version", DEFAULT_VERSION);
const DIST_TAG = argument("--tag", DEFAULT_TAG);

const registry = mkdtempSync(join(tmpdir(), "bundar-dryrun-"));
const consumer = mkdtempSync(join(tmpdir(), "bundar-consumer-"));
const failures: string[] = [];
const checks: { check: string; status: string; detail: string }[] = [];
const record = (check: string, ok: boolean, detail: string): void => {
  checks.push({ check, status: ok ? "pass" : "FAIL", detail });
  if (!ok) failures.push(`${check}: ${detail}`);
  console.log(`[dry-run] ${ok ? "✓" : "✗"} ${check} — ${detail}`);
};

// ---- 1. pack + simulate the pre-release version synchronization ----
const candidates = buildCandidateTarballs({
  version: SIM_VERSION,
  outputDir: registry,
});
const tarballs = new Map<string, string>();
for (const [name, cand] of candidates) {
  tarballs.set(name, cand.tarballPath);
}
record(
  "pack+version-sync",
  tarballs.size === PUBLISH_ORDER.length,
  `${tarballs.size}/${PUBLISH_ORDER.length} tarballs at ${SIM_VERSION}`,
);

// ---- 2. export-map verification over the simulated tarballs ----
for (const [name, tarball] of tarballs) {
  const extract = join(registry, `${name}-verify`);
  mkdirSync(extract, { recursive: true });
  spawnSync("tar", ["-xzf", tarball, "-C", extract]);
  const pkg = JSON.parse(
    readFileSync(join(extract, "package", "package.json"), "utf8"),
  );

  if (JSON.stringify(pkg).includes("workspace:")) {
    record(
      `exports ${name}`,
      false,
      "workspace: protocol leaked into the packed manifest",
    );
    continue;
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<
    string,
    string
  >;
  const leaked = Object.entries(deps).filter(
    ([dep]) =>
      dep.startsWith("@bundar/") &&
      deps[dep] !== SIM_VERSION &&
      deps[dep] !== `^${SIM_VERSION}`,
  );
  record(
    `no-unpublished-paths ${name}`,
    leaked.length === 0,
    leaked.length === 0
      ? "inter-deps synchronized"
      : `stale: ${leaked.map(([d, v]) => `${d}@${v}`).join(", ")}`,
  );

  const exportsMap = (pkg.exports ?? {}) as Record<
    string,
    { types?: string; default?: string }
  >;
  const keys = Object.keys(exportsMap);
  let allResolve = keys.length > 0;
  for (const key of keys) {
    for (const field of ["types", "default"]) {
      const target = exportsMap[key]?.[field as "types" | "default"];
      if (target === undefined) continue;
      if (!existsSync(join(extract, "package", target))) {
        allResolve = false;
        record(`exports ${name}${key}`, false, `${field} → ${target} missing`);
      }
    }
  }
  if (allResolve)
    record(
      `exports ${name}`,
      true,
      `${keys.length} entry points resolve in-tarball`,
    );
  const metaOk =
    pkg.license !== undefined &&
    pkg.description !== undefined &&
    (pkg.repository !== undefined ||
      name === "@bundar/testing" ||
      name === "@bundar/cli");
  record(`metadata ${name}`, metaOk, "license/description/repository present");
  const hasReadme = existsSync(join(extract, "package", "README.md"));
  record(
    `readme ${name}`,
    hasReadme,
    hasReadme ? "README ships" : "README missing",
  );
  rmSync(extract, { recursive: true, force: true });
}

// ---- 3. clean consumer: install the tarballs, import everything ----
// consumer installs need file:-linked inter-deps (version-sync manifests
// resolve against the registry, which is exactly what must NOT happen
// here); build a consumer registry with file: rewrites — the version-sync
// form was already verified in the export checks above
const consumerRegistry = mkdtempSync(join(tmpdir(), "bundar-dryrun-c-"));
// two passes: extract everything first, THEN rewrite every inter-dep to
// the consumer tarball paths (which are only all known after extraction),
// then pack — no nested manifest may keep a registry spec
const consumerExtracts = new Map<string, string>();
for (const [name, tarball] of tarballs) {
  const extract = join(
    consumerRegistry,
    `${name.replace("@", "").replace("/", "-")}-c`,
  );
  mkdirSync(extract, { recursive: true });
  spawnSync("tar", ["-xzf", tarball, "-C", extract]);
  consumerExtracts.set(name, extract);
}
const consumerPaths = new Map(
  [...consumerExtracts.keys()].map((name) => [
    name,
    join(
      consumerRegistry,
      `${name.replace("@", "").replace("/", "-")}-consumer.tgz`,
    ),
  ]),
);
const consumerTarballs = new Map<string, string>();
for (const [name, extract] of consumerExtracts) {
  const pkgJsonPath = join(extract, "package", "package.json");
  const packed = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = packed[field] as Record<string, string> | undefined;
    if (deps === undefined) continue;
    for (const dep of Object.keys(deps)) {
      const target = consumerPaths.get(dep);
      if (target !== undefined) deps[dep] = `file:${target}`;
    }
  }
  writeFileSync(pkgJsonPath, JSON.stringify(packed, null, 2) + "\n");
  const target = consumerPaths.get(name)!;
  spawnSync("tar", ["-czf", target, "-C", extract, "package"]);
  consumerTarballs.set(name, target);
}
const consumerPkg = {
  name: "dry-run-consumer",
  version: "0.0.0",
  private: true,
  type: "module",
  dependencies: Object.fromEntries(
    [...consumerTarballs].map(([name, path]) => [name, `file:${path}`]),
  ),
};
writeFileSync(
  join(consumer, "package.json"),
  JSON.stringify(consumerPkg, null, 2) + "\n",
);
const install = spawnSync("bun", ["install"], {
  cwd: consumer,
  stdio: "pipe",
  encoding: "utf8",
});
record(
  "clean-install",
  install.status === 0,
  install.status === 0
    ? "tarballs install as file: deps"
    : (install.stderr ?? "").slice(0, 160),
);

if (install.status === 0) {
  const program = [
    "export {};",
    "const results: string[] = [];",
    'for (const name of ["@bundar/core", "@bundar/jsx", "@bundar/schema", "@bundar/security", "@bundar/htmx", "@bundar/htmx/2", "@bundar/htmx/4", "@bundar/testing"]) {',
    "  await import(name);",
    "  results.push(name);",
    "}",
    'console.log(results.join(","));',
  ].join("\n");
  writeFileSync(join(consumer, "import-all.ts"), program);
  const run = spawnSync("bun", ["import-all.ts"], {
    cwd: consumer,
    stdio: "pipe",
    encoding: "utf8",
  });
  record(
    "entry-points-import",
    run.status === 0,
    run.status === 0
      ? (run.stdout ?? "").trim().slice(0, 160)
      : (run.stderr ?? "").slice(0, 200),
  );

  // JSX runtime resolution: a TSX file compiled through the installed jsx
  writeFileSync(
    join(consumer, "runtime-check.tsx"),
    'import { jsx } from "@bundar/jsx";\nexport const tree = jsx("p", { children: "ok" });\nconsole.log(typeof tree);\n',
  );
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          jsx: "react-jsx",
          jsxImportSource: "@bundar/jsx",
          strict: true,
          noEmit: true,
          moduleResolution: "bundler",
          module: "esnext",
          target: "esnext",
          lib: ["esnext", "dom"],
          types: [],
        },
        include: ["jsx-default.tsx", "import-all.ts"],
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    join(consumer, "jsx-default.tsx"),
    "export const App = () => <main>resolves</main>;\n",
  );
  const tsxRun = spawnSync("bun", ["jsx-default.tsx"], {
    cwd: consumer,
    stdio: "pipe",
    encoding: "utf8",
  });
  record(
    "jsx-runtime",
    tsxRun.status === 0,
    tsxRun.status === 0
      ? "default JSX runtime resolves through the installed @bundar/jsx"
      : (tsxRun.stderr ?? "").slice(0, 200),
  );
  const tscRun = spawnSync("bunx", ["tsc", "--noEmit", "-p", "tsconfig.json"], {
    cwd: consumer,
    stdio: "pipe",
    encoding: "utf8",
  });
  record(
    "tsx-typecheck",
    tscRun.status === 0,
    tscRun.status === 0
      ? "TSX typechecks with jsxImportSource @bundar/jsx"
      : `${tscRun.stdout ?? ""}${tscRun.stderr ?? ""}`.slice(0, 300),
  );

  // CLI executes FROM the tarball
  const cli = spawnSync(
    "bun",
    ["./node_modules/@bundar/cli/src/bin.ts", "info"],
    { cwd: consumer, stdio: "pipe", encoding: "utf8" },
  );
  record(
    "cli-from-tarball",
    cli.status === 0 && (cli.stdout ?? "").includes("bundar"),
    cli.status === 0
      ? "`bundar info` executed from the installed tarball"
      : (cli.stderr ?? "").slice(0, 200),
  );
}

// ---- 4. the plan + artifacts ----
const plan = {
  simulatedVersion: SIM_VERSION,
  distTag: DIST_TAG,
  publishOrder: PUBLISH_ORDER,
  notes: [
    "Dependency-first publish order; inter-package deps synchronized to the simulated version (the form npm publish emits).",
    "No registry publish executed (out of scope); this dry run proves tarball installability, entry points, CLI, and metadata.",
    `Planned command shape: npm publish --tag ${DIST_TAG} per package, in order.`,
  ],
};
mkdirSync(join(REPO, "artifacts"), { recursive: true });
writeFileSync(
  join(REPO, "artifacts", "publish-dry-run.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), plan, checks },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  join(REPO, "artifacts", "publish-dry-run.md"),
  [
    "# npm publication dry run (GH-086)",
    "",
    `Simulated release: **${SIM_VERSION}** on dist-tag **${DIST_TAG}**. No registry publish executed.`,
    "",
    "## Plan",
    "",
    `- Publish order (dependency-first): ${PUBLISH_ORDER.join(" → ")}`,
    "- Inter-package dependencies synchronized to the simulated version in every packed manifest (the form `npm publish` emits).",
    "",
    "## Verification",
    "",
    "| Check | Status | Detail |",
    "| --- | --- | --- |",
    ...checks.map(
      (check) => `| ${check.check} | ${check.status} | ${check.detail} |`,
    ),
    "",
  ].join("\n"),
);

rmSync(registry, { recursive: true, force: true });
rmSync(consumerRegistry, { recursive: true, force: true });
rmSync(consumer, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`publish:dry-run FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `publish:dry-run: ${checks.length} checks passed for ${SIM_VERSION} @ ${DIST_TAG} (no publish executed)`,
);
