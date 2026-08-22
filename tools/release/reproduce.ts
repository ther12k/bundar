/**
 * release:reproduce (GH-085): clean-rebuild comparison — pack every
 * package twice in independent runs and compare the UNPACKED trees
 * byte-for-byte. Tarball BYTES are not compared: gzip embeds mtimes
 * (the documented nondeterminism); the content trees must be identical.
 * Exit 0 = reproducible; any file difference fails with the diff list.
 */
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const REPO = join(import.meta.dir, "..", "..");
const PACKAGES = [
  "packages/core",
  "packages/jsx",
  "packages/schema",
  "packages/security",
  "packages/htmx",
  "packages/testing",
  "packages/cli",
  "create-bundar",
];

function packTree(dir: string, into: string): Map<string, string> {
  const manifest = JSON.parse(
    readFileSync(join(REPO, dir, "package.json"), "utf8"),
  );
  spawnSync("bun", ["pm", "pack"], { cwd: join(REPO, dir), stdio: "ignore" });
  const tarball = `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`;
  const produced = join(REPO, dir, tarball);
  mkdirSync(into, { recursive: true });
  spawnSync("tar", ["-xzf", produced, "-C", into]);
  rmSync(produced);
  const hashes = new Map<string, string>();
  for (const file of readdirSync(into, { recursive: true })) {
    const full = join(into, String(file));
    if (!statSync(full).isFile()) continue;
    hashes.set(
      String(file),
      createHash("sha256").update(readFileSync(full)).digest("hex"),
    );
  }
  return hashes;
}

const differences: string[] = [];
const report: Record<string, { files: number; identical: boolean }> = {};
for (const dir of PACKAGES) {
  const first = packTree(dir, mkdtempSync(join(tmpdir(), "repro-a-")));
  const second = packTree(dir, mkdtempSync(join(tmpdir(), "repro-b-")));
  const keys = new Set([...first.keys(), ...second.keys()]);
  let identical = true;
  for (const key of keys) {
    if (first.get(key) !== second.get(key)) {
      identical = false;
      differences.push(
        `${dir}/${key}: run1 ${first.get(key) ?? "missing"} vs run2 ${second.get(key) ?? "missing"}`,
      );
    }
  }
  report[dir] = { files: first.size, identical };
}

mkdirSync(join(REPO, "artifacts", "provenance"), { recursive: true });
writeFileSync(
  join(REPO, "artifacts", "provenance", "reproducibility.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      method:
        "two independent `bun pm pack` runs; unpacked trees compared file-by-file (SHA-256)",
      nondeterministicFields: [
        "tarball gzip bytes embed mtimes — tarballs are not byte-comparable across runs; content trees are",
      ],
      packages: report,
      reproducible: differences.length === 0,
    },
    null,
    2,
  ) + "\n",
);

if (differences.length > 0) {
  console.error("release:reproduce: DIFFERENCES:");
  for (const difference of differences) console.error(`  - ${difference}`);
  process.exit(1);
}
console.log(
  `release:reproduce: ${Object.keys(report).length} packages reproducible (unpacked trees byte-identical across runs)`,
);
