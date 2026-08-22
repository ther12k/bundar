/**
 * `bundar routes` command (GH-073): generate/check typed URL-builder modules.
 *
 * The generator loads an app entry module, reads its route manifest, and
 * writes/compares the generated module. Application handlers are never
 * invoked; only the registered descriptor data is read.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CommandContext, CommandDefinition } from "../cli";
import { buildRouteManifest, generateRoutesModule } from "@bundar/core";

const DEFAULT_ENTRY = "src/app.ts";
const DEFAULT_OUT = "src/routes.gen.ts";

function loadAppManifest(entryPath: string): {
  manifest: ReturnType<typeof buildRouteManifest> | null;
  error?: string;
} {
  // Execute the entry in a child process that prints its manifest as JSON.
  // Handlers never run: importing the module registers routes but Bun.serve
  // is only started if the app explicitly calls serve() — generators assume
  // app modules export their App instead of side-effecting a server.
  const probe = `
import { App } from "@bundar/core";
const mod = await import(${JSON.stringify(resolve(entryPath))});
const app = mod.default ?? mod.app;
if (!app || typeof app.manifest !== "function") {
  console.error("routes:generate: entry must default-export an App (got " + typeof app + ")");
  process.exit(2);
}
const { buildRouteManifest } = await import("@bundar/core");
console.log(JSON.stringify(buildRouteManifest(app.manifest())));
`;
  const result = spawnSync("bun", ["-e", probe], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return {
      manifest: null,
      error: (result.stderr || result.stdout || "entry failed to load").trim(),
    };
  }
  try {
    return { manifest: JSON.parse(result.stdout.trim()) };
  } catch {
    return { manifest: null, error: "entry printed invalid manifest JSON" };
  }
}

export const routesCommand: CommandDefinition = {
  name: "routes",
  description:
    "Generate or check typed URL-builder modules from named routes (generate|check)",
  handler: (ctx: CommandContext) => {
    const subcommand = ctx.args[0] ?? "generate";
    const entry = (ctx.flags.entry as string | undefined) ?? DEFAULT_ENTRY;
    const out = (ctx.flags.out as string | undefined) ?? DEFAULT_OUT;

    if (subcommand !== "generate" && subcommand !== "check") {
      console.error(
        `bundar routes: unknown subcommand "${subcommand}" (expected generate or check)`,
      );
      return 1;
    }

    if (!existsSync(entry)) {
      console.error(`bundar routes: entry "${entry}" not found`);
      return 1;
    }

    const { manifest, error } = loadAppManifest(entry);
    if (!manifest) {
      console.error(`bundar routes: ${error}`);
      return 1;
    }

    const generated = generateRoutesModule(manifest);
    const target = resolve(out);

    if (subcommand === "generate") {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, generated);
      console.log(
        `bundar routes: generated ${manifest.routes.length} named route(s) → ${out}`,
      );
      return 0;
    }

    // check mode: stale-generation detection
    if (!existsSync(target)) {
      console.error(
        `bundar routes:check: ${out} does not exist; run routes:generate first`,
      );
      return 1;
    }
    const current = readFileSync(target, "utf8");
    if (current !== generated) {
      console.error(
        `bundar routes:check: ${out} is stale (routes changed since generation); re-run routes:generate`,
      );
      return 1;
    }
    console.log(`bundar routes:check: ${out} is up to date`);
    return 0;
  },
};
