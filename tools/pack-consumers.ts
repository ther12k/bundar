/**
 * test:pack-consumers (GH-081): every publishable package packs cleanly
 * and its manifest survives the pack boundary — exports/types/files
 * present, no runtime dependencies beyond the ADR-allowed set, and the
 * packed tarball contains the declared file list (pack:inspect logic
 * per package, fail-closed aggregation).
 */
import { spawnSync } from "node:child_process";

const PACKAGES = [
  "@bundar/core",
  "@bundar/jsx",
  "@bundar/schema",
  "@bundar/security",
  "@bundar/htmx",
  "@bundar/testing",
  "@bundar/cli",
  "create-bundar",
] as const;

let failed = 0;
for (const pkg of PACKAGES) {
  const result = spawnSync("bun", ["run", "pack:inspect", pkg], {
    stdio: "inherit",
    cwd: import.meta.dir + "/..",
  });
  if (result.status !== 0) {
    console.error(`pack-consumers: ${pkg} FAILED`);
    failed += 1;
  }
}
if (failed > 0) {
  console.error(`pack-consumers: ${failed} package(s) failed`);
  process.exit(1);
}
console.log(
  `pack-consumers: ${PACKAGES.length}/${PACKAGES.length} packed manifests verified`,
);
