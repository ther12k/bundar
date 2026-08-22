/**
 * create-bundar CLI (GH-071): interactive when attached to a TTY with no
 * arguments, non-interactive with flags (the tested path).
 *
 *   create-bundar <target> [--dialect htmx2|htmx4-experimental] [--name <name>]
 */
import {
  createProject,
  DIALECTS,
  HTMX4_EXPERIMENTAL_NOTICE,
  ScaffoldError,
  type ScaffoldDialect,
} from "./index";

export interface CliOptions {
  readonly args: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
  /** TTY detection; tests pass false and provide everything explicitly. */
  readonly interactive?: boolean;
  readonly prompt?: (question: string) => Promise<string>;
  readonly out?: (line: string) => void;
}

function parseFlags(raw: readonly string[]): {
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i]!;
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key.includes("=")) {
      const [k, v] = key.split("=", 2);
      flags[k!] = v!;
    } else if (i + 1 < raw.length && !raw[i + 1]!.startsWith("--")) {
      flags[key] = raw[i + 1]!;
      i += 1;
    } else {
      flags[key] = true;
    }
  }
  return { positional, flags };
}

export async function runCreateBundar(options: CliOptions): Promise<number> {
  const out = options.out ?? ((line: string) => console.log(line));
  const { positional, flags } = (() => {
    const merged = parseFlags(options.args);
    return {
      positional: merged.positional,
      flags: { ...merged.flags, ...options.flags } as Record<
        string,
        string | boolean
      >,
    };
  })();

  let target = positional[0];
  let dialectValue =
    typeof flags["dialect"] === "string" ? flags["dialect"] : undefined;

  // Interactive path (TTY only): ask for what is missing.
  if (options.interactive === true) {
    const ask = options.prompt ?? askOnTty;
    if (target === undefined) {
      target = (await ask("Project directory: ")).trim() || undefined;
    }
    if (dialectValue === undefined) {
      const answer = (
        await ask("Dialect [htmx2 | htmx4-experimental] (default htmx2): ")
      ).trim();
      dialectValue = answer.length > 0 ? answer : "htmx2";
    }
  }

  if (target === undefined || target.length === 0) {
    out(
      "usage: create-bundar <target> [--dialect htmx2|htmx4-experimental] [--name <name>]",
    );
    return 1;
  }

  let dialect: ScaffoldDialect;
  if (dialectValue === undefined) {
    dialect = "htmx2"; // stable default
  } else if ((DIALECTS as readonly string[]).includes(dialectValue)) {
    dialect = dialectValue as ScaffoldDialect;
  } else {
    out(
      `create-bundar: unknown dialect ${JSON.stringify(dialectValue)} (supported: ${DIALECTS.join(", ")})`,
    );
    return 1;
  }

  try {
    const result = createProject({
      target,
      dialect,
      ...(typeof flags["name"] === "string" ? { name: flags["name"] } : {}),
    });
    out(`created ${result.name} in ${result.directory}`);
    out(`  files: ${result.files.length}`);
    out("  next: bun install && bun run dev");
    if (result.dialect === "htmx4-experimental") {
      out(HTMX4_EXPERIMENTAL_NOTICE);
    }
    return 0;
  } catch (error) {
    if (error instanceof ScaffoldError) {
      out(`create-bundar: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

async function askOnTty(question: string): Promise<string> {
  process.stdout.write(question);
  const reader = Bun.stdin.stream().getReader();
  let answer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    answer += new TextDecoder().decode(value);
    if (answer.includes("\n")) break;
  }
  await reader.cancel();
  return answer.trim();
}
