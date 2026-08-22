/**
 * Bundar CLI command framework.
 * Lightweight, dependency-free command parser with diagnostic reporting.
 */
import { routesCommand } from "./commands/routes";

export const BUNDAR_VERSION = "0.0.0";

export interface CommandContext {
  args: string[];
  flags: Record<string, string | boolean>;
}

export type CommandHandler = (ctx: CommandContext) => Promise<number> | number;

export interface CommandDefinition {
  name: string;
  description: string;
  handler: CommandHandler;
}

const commands = new Map<string, CommandDefinition>();

export function registerCommand(def: CommandDefinition): void {
  commands.set(def.name, def);
}

export function parseArgs(rawArgs: string[]): {
  commandName: string | null;
  args: string[];
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  const args: string[] = [];
  let commandName: string | null = null;

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (key.includes("=")) {
        const [k, v] = key.split("=", 2);
        flags[k!] = v!;
      } else if (i + 1 < rawArgs.length && !rawArgs[i + 1]!.startsWith("-")) {
        flags[key] = rawArgs[i + 1]!;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      flags[key] = true;
    } else if (commandName === null) {
      commandName = arg;
    } else {
      args.push(arg);
    }
  }

  return { commandName, args, flags };
}

function printHelp(): void {
  console.log(`bundar v${BUNDAR_VERSION} — Bun-native HTML-first framework

Usage:
  bundar <command> [options]

Options:
  --help, -h       Show help
  --version, -v    Show version

Commands:
  info             Show environment diagnostics (Bun, platform, versions)`);
}

function printVersion(): void {
  console.log(`bundar ${BUNDAR_VERSION}`);
}

function runInfo(): number {
  console.log(
    JSON.stringify(
      {
        bundar: BUNDAR_VERSION,
        bun: typeof Bun !== "undefined" ? Bun.version : "unknown",
        platform: process.platform,
        arch: process.arch,
      },
      null,
      2,
    ),
  );
  return 0;
}

// Register built-in info command
registerCommand({
  name: "info",
  description: "Show environment diagnostics without leaking secrets",
  handler: runInfo,
});

// GH-073: routes generate/check
registerCommand(routesCommand);

export async function runCli(rawArgs: string[]): Promise<number> {
  const { commandName, args, flags } = parseArgs(rawArgs);

  if (
    flags["help"] ||
    flags["h"] ||
    (commandName === null && Object.keys(flags).length === 0)
  ) {
    printHelp();
    return 0;
  }

  if (flags["version"] || flags["v"]) {
    printVersion();
    return 0;
  }

  if (commandName === null) {
    printHelp();
    return 0;
  }

  const cmd = commands.get(commandName);
  if (!cmd) {
    console.error(
      `bundar: unknown command "${commandName}". Run "bundar --help" for usage.`,
    );
    return 1;
  }

  try {
    return await cmd.handler({ args, flags });
  } catch (err) {
    console.error(
      `bundar error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 1;
  }
}
