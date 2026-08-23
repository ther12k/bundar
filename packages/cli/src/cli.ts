/**
 * Bundar CLI command framework.
 * Lightweight, dependency-free command parser with diagnostic reporting
 * and the BR-046 machine-readable contract (--json/--quiet/--dry-run/
 * --no-color, documented exit codes, versioned JSON envelope).
 */
import { routesCommand } from "./commands/routes";
import { devCommand } from "./commands/dev";
import { htmxAuditCommand } from "./commands/htmx-audit";
import { inspectCommand } from "./commands/inspect";
import {
  buildEnvelope,
  EXIT,
  printEnvelope,
  type CliEnvelopeV1,
  type ExitCode,
} from "./machine";

export type { CliEnvelopeV1, ExitCode } from "./machine";
export { EXIT } from "./machine";

export const BUNDAR_VERSION = "0.0.0";

export interface CommandContext {
  args: string[];
  flags: Record<string, string | boolean>;
  /** Machine mode: emit exactly one JSON envelope on stdout. */
  json: boolean;
  /** Suppress nonessential human output. */
  quiet: boolean;
  /** Describe planned writes without changing the filesystem. */
  dryRun: boolean;
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

/** Flags consumed by the framework itself, never forwarded to handlers. */
const GLOBAL_FLAGS = ["json", "no-color", "quiet", "dry-run"] as const;

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
      if ((GLOBAL_FLAGS as readonly string[]).includes(key)) {
        flags[key] = true;
      } else if (key.includes("=")) {
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

Global options (BR-046 contract):
  --json           Machine mode: one versioned JSON envelope on stdout
  --no-color       Strip all ANSI styling from output
  --quiet          Suppress nonessential output
  --dry-run        Describe planned writes without changing anything

Exit codes:
  0 ok · 1 usage/validation · 2 environment · 3 execution failure

Options:
  --help, -h       Show help
  --version, -v    Show version

Commands:
  dev              Run the app with hot reload (development only)
  htmx-audit       Audit source for htmx 2→4 migration-sensitive patterns
  doctor           Environment diagnostics (secrets-safe)
  info             Alias of doctor
  inspect          Bounded offline project manifest (repo/app/feature)`);
}

/** Per-run collection for warnings/errors/next hints and envelope data. */
interface RunCollector {
  warnings: string[];
  errors: string[];
  next: string[];
  data?: unknown;
}

let collector: RunCollector | null = null;

/** Commands call these to enrich the machine envelope (BR-046). */
export function warn(message: string): void {
  collector?.warnings.push(message);
}
export function suggestNext(...commands: string[]): void {
  collector?.next.push(...commands);
}
export function setData(data: unknown): void {
  collector!.data = data;
}
export function fail(message: string): void {
  collector?.errors.push(message);
}

/**
 * Environment diagnostics, secrets-safe (BR-046 verification target).
 */
export async function runDoctor(ctx: CommandContext): Promise<ExitCode> {
  const data = {
    bundar: BUNDAR_VERSION,
    bun: typeof Bun !== "undefined" ? Bun.version : "unknown",
    platform: process.platform,
    arch: process.arch,
    tty: process.stdout.isTTY === true,
  };
  if (!ctx.json) {
    console.log(
      [
        `bundar ${data.bundar}`,
        `bun ${data.bun}`,
        `${data.platform}/${data.arch}`,
        data.tty ? "interactive" : "noninteractive",
      ].join("\n"),
    );
  }
  if (ctx.json) setData(data);
  suggestNext("bundar routes generate");
  return EXIT.ok;
}

registerCommand({
  name: "doctor",
  description: "Show environment diagnostics without leaking secrets",
  handler: runDoctor,
});

// Back-compat alias for GH-070's info command. Envelopes report the
// CANONICAL name so repeated runs and aliases stay comparable.
const COMMAND_ALIASES: Readonly<Record<string, string>> = { info: "doctor" };
registerCommand({
  name: "info",
  description: "Alias of doctor",
  handler: runDoctor,
});

// GH-073: routes generate/check
registerCommand(routesCommand);

// GH-072: development command and reload loop
registerCommand(devCommand);

// GH-078: htmx 2→4 migration audit
registerCommand(htmxAuditCommand);

// BR-047: bounded offline project manifest
registerCommand(inspectCommand);

export interface RunResult {
  exitCode: number;
  envelope: CliEnvelopeV1 | null;
}

/**
 * Runs the CLI. In `--json` mode exactly one envelope goes to stdout and
 * prompts are prohibited (environment failure instead).
 */
export async function runCli(rawArgs: string[]): Promise<number> {
  const { exitCode } = await runCliWithEnvelope(rawArgs);
  return exitCode;
}

export async function runCliWithEnvelope(
  rawArgs: string[],
): Promise<RunResult> {
  const { commandName, args, flags } = parseArgs(rawArgs);
  const json = flags["json"] === true;
  const ctx: CommandContext = {
    args,
    flags,
    json,
    quiet: flags["quiet"] === true,
    dryRun: flags["dry-run"] === true,
  };

  const finish = (
    exitCode: ExitCode,
    errors: string[] = [],
    extra?: Partial<Pick<RunCollector, "data" | "next">>,
  ): RunResult => {
    if (!json) return { exitCode, envelope: null };
    const envelope = buildEnvelope({
      command:
        commandName !== null
          ? (COMMAND_ALIASES[commandName] ?? commandName)
          : null,
      exitCode,
      warnings: collector?.warnings ?? [],
      errors: [...(collector?.errors ?? []), ...errors],
      ...(extra?.data !== undefined || collector?.data !== undefined
        ? { data: extra?.data ?? collector?.data }
        : {}),
      next: extra?.next ?? collector?.next ?? [],
    });
    printEnvelope(envelope);
    return { exitCode, envelope };
  };

  if (
    flags["help"] ||
    flags["h"] ||
    (commandName === null && Object.keys(flags).length === 0)
  ) {
    printHelp();
    return { exitCode: EXIT.ok, envelope: null };
  }

  if (flags["version"] || flags["v"]) {
    console.log(`bundar ${BUNDAR_VERSION}`);
    return { exitCode: EXIT.ok, envelope: null };
  }

  if (commandName === null) {
    printHelp();
    return { exitCode: EXIT.ok, envelope: null };
  }

  const cmd = commands.get(commandName);
  if (!cmd) {
    const message = `unknown command "${commandName}". Run "bundar --help" for usage.`;
    if (!json) console.error(`bundar: ${message}`);
    return finish(EXIT.usage, [message]);
  }

  // BR-046: prompts are prohibited in JSON mode or when stdin is piped.
  if (json && process.stdin.isTTY !== true && cmd.name === "dev") {
    const message =
      "interactive prompt required but stdin is not a TTY (JSON mode prohibits prompts)";
    return finish(EXIT.environment, [message]);
  }

  collector = { warnings: [], errors: [], next: [] };
  try {
    const code = await cmd.handler(ctx);
    const result = finish(code as ExitCode);
    collector = null;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!json) console.error(`bundar error: ${message}`);
    const result = finish(EXIT.execution, [message]);
    collector = null;
    return result;
  }
}
