/**
 * Removes generated build artifacts from workspace packages.
 * Sources, tests, and bun.lock are never touched.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");

const artifactDirectories = [
  "packages/core/dist",
  "packages/jsx/dist",
  "packages/htmx/dist",
  "packages/schema/dist",
  "packages/testing/dist",
  "packages/cli/dist",
  "create-bundar/dist",
];

let removed = 0;
for (const relative of artifactDirectories) {
  const target = join(repositoryRoot, relative);
  if (!existsSync(target)) continue;
  rmSync(target, { recursive: true, force: true });
  console.log(`removed ${relative}`);
  removed += 1;
}

console.log(
  `clean: removed ${removed} artifact ${removed === 1 ? "directory" : "directories"}`,
);
