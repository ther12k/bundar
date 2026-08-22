/**
 * `bundar dev` command (GH-072): run the application under Bun's hot
 * reload with clear diagnostics and reliable cleanup.
 *
 * Process model (documented contract):
 * - The command spawns ONE child: `bun --hot <entry>`. Bun's hot mode
 *   re-evaluates changed modules IN the same process and swaps the
 *   Bun.serve server on the same port — edited route/component files take
 *   effect without a restart, so listeners are never duplicated.
 * - Syntax/compile failures print Bun's diagnostic (file:line) and the
 *   previously-loaded code keeps serving; the dev command stays up.
 * - SIGINT/SIGTERM are forwarded to the child and escalate to SIGKILL
 *   after a grace period; the child's exit code propagates.
 * - Development only: production runs `bun <entry>` directly (no flags,
 *   no watcher). The dev command never gains production behavior.
 */
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { CommandContext, CommandDefinition } from "../cli";
import { superviseChild } from "../process/child";

const CANDIDATE_ENTRIES = ["src/app.ts", "src/index.ts", "app.ts", "index.ts"];

export interface DevOptions {
  readonly entry: string;
  readonly port?: number;
}

/** Resolves the entry file: explicit flag/arg first, then conventional defaults. */
export function resolveDevEntry(
  args: readonly string[],
  flags: Readonly<Record<string, string | boolean>>,
  cwd = process.cwd(),
): { entry: string } | { error: string } {
  const explicit =
    typeof flags["entry"] === "string" && flags["entry"].length > 0
      ? flags["entry"]
      : args[0];
  if (explicit !== undefined) {
    const candidate = isAbsolute(explicit) ? explicit : resolve(cwd, explicit);
    if (!existsSync(candidate)) {
      return { error: `dev: entry not found: ${explicit}` };
    }
    return { entry: candidate };
  }
  for (const candidate of CANDIDATE_ENTRIES) {
    const path = resolve(cwd, candidate);
    if (existsSync(path)) return { entry: path };
  }
  return {
    error: `dev: no entry found (looked for ${CANDIDATE_ENTRIES.join(", ")}); pass --entry <file>`,
  };
}

/** Builds the child argv for the dev loop (separate for testability). */
export function devChildArgs(options: DevOptions): readonly string[] {
  const args = ["--hot"];
  if (options.port !== undefined) args.push("--port", String(options.port));
  args.push(options.entry);
  return args;
}

export const devCommand: CommandDefinition = {
  name: "dev",
  description: "Run the app with hot reload (development only)",
  handler: async (ctx: CommandContext): Promise<number> => {
    const resolved = resolveDevEntry(ctx.args, ctx.flags);
    if ("error" in resolved) {
      console.error(resolved.error);
      return 1;
    }
    const port =
      typeof ctx.flags["port"] === "string"
        ? Number(ctx.flags["port"])
        : undefined;
    const options: DevOptions = {
      entry: resolved.entry,
      ...(Number.isInteger(port) ? { port } : {}),
    };

    console.log(
      `dev: bun ${devChildArgs(options).join(" ")} (hot reload; SIGINT/SIGTERM forwarded)`,
    );
    const child = superviseChild(process.execPath, [...devChildArgs(options)], {
      env: { NODE_ENV: "development", BUNAR_DEV: "1" },
    });
    const code = await child.exited;
    // a signal-initiated stop is a normal dev shutdown, not a failure
    return child.intentionallyStopped() ? 0 : code;
  },
};
