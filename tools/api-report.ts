/**
 * api:report (GH-023): renders the @bundar/core public API surface as a
 * Markdown report — runtime exports, type-only exports, and counts — for
 * review as a snapshot artifact.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as core from "../packages/core/src/index";

const runtimeExports = Object.keys(core).sort();
const module = await import("../packages/core/src/index");
const source = await Bun.file(
  join(import.meta.dir, "../packages/core/src/index.ts"),
).text();
const typeOnlyMatches = source.match(/export type \{[^}]*\}/g) ?? [];
const typeOnly = typeOnlyMatches
  .flatMap((block) =>
    block
      .replace("export type {", "")
      .replace("}", "")
      .split(",")
      .map((name) => name.trim().split(" as ")[0]!.trim()),
  )
  .filter((name) => name.length > 0)
  .sort();

const report = [
  "# @bundar/core API report",
  "",
  `Runtime exports (${runtimeExports.length}):`,
  ...runtimeExports.map((name) => `- \`${name}\``),
  "",
  `Type-only exports (${typeOnly.length}):`,
  ...typeOnly.map((name) => `- \`${name}\` (type)`),
  "",
  `Total public surface: ${runtimeExports.length + typeOnly.length}`,
  "",
].join("\n");

const outDir = join(import.meta.dir, "../artifacts/api");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "core.md"), report);
console.log(
  `api:report: ${runtimeExports.length} runtime + ${typeOnly.length} type exports → artifacts/api/core.md`,
);
void module;
