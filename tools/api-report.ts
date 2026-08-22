/**
 * api:report (GH-023): renders the @bundar/core public API surface as a
 * Markdown report — runtime exports, type-only exports, and counts — for
 * review as a snapshot artifact. GH-025 adds the exported renderer so
 * api:check can byte-compare the committed snapshot against the live
 * surface.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type CoreApiReport = {
  report: string;
  runtimeCount: number;
  typeCount: number;
};

export async function renderCoreApiReport(): Promise<CoreApiReport> {
  const module = await import("../packages/core/src/index");
  const runtimeExports = Object.keys(module).sort();
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
  return {
    report,
    runtimeCount: runtimeExports.length,
    typeCount: typeOnly.length,
  };
}

if (import.meta.main) {
  const { report, runtimeCount, typeCount } = await renderCoreApiReport();
  const outDir = join(import.meta.dir, "../artifacts/api");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "core.md"), report);
  console.log(
    `api:report: ${runtimeCount} runtime + ${typeCount} type exports → artifacts/api/core.md`,
  );
}
