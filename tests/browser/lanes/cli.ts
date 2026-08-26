/**
 * Shared playwright-cli lane runner for BR-075 lanes (accessibility,
 * no-JS): same invocation contract as tests/browser/run.ts — every step's
 * stdout/stderr/command is archived, and required steps throw on nonzero.
 *
 * Toolchain resolution (BR-091 + BR-099): the CLI is the PINNED local
 * binary from root devDependencies (@playwright/cli via bun.lock — never
 * an `npx latest` fetch, no environment-dependent fallbacks), so an exact
 * commit plus a frozen lock determine the browser test environment. The
 * only escape hatch is the explicit BUNDAR_PLAYWRIGHT_CLI override.
 * createLaneRunner fails closed when the pinned binary is absent and
 * stamps every artifact directory with toolchain.json recording the CLI
 * version, the Playwright runtime version, and the Chromium revision.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..", "..", "..");

export interface LaneRunner {
  run(name: string, args: string[], required?: boolean): Promise<number>;
  artifactDirectory: string;
}

export type CliSource = "override" | "local-pinned";

const LOCAL_BIN = join(
  repositoryRoot,
  "node_modules",
  ".bin",
  "playwright-cli",
);

/** Fails closed per BR-099: override wins; otherwise the pinned local
 * binary MUST exist. No network resolution, no npx, no fallbacks. */
export function resolvePlaywrightCli(env: Record<string, string | undefined>): {
  path: string;
  source: CliSource;
} {
  const override = env["BUNDAR_PLAYWRIGHT_CLI"];
  if (override) return { path: override, source: "override" };
  if (!existsSync(LOCAL_BIN)) {
    throw new Error(
      "pinned @playwright/cli not installed — run `bun install` (BR-099 rejects unpinned npx fallbacks)",
    );
  }
  return { path: LOCAL_BIN, source: "local-pinned" };
}

interface ToolchainIdentity {
  cli: { name: string; version: string };
  playwrightRuntime: { version: string };
  chromiumRevision: string | null;
  chromiumHeadlessShellRevision: string | null;
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

/** Resolves versions/revision from the INSTALLED tree under bun.lock. */
export function toolchainIdentity(): ToolchainIdentity {
  // Resolve THROUGH the CLI package: playwright-core is only a transitive
  // dependency, so the root resolver cannot see it directly.
  // realpath: bun's isolated layout symlinks node_modules entries into
  // the shared .bun store; resolution must happen from the REAL location.
  const cliDir = realpathSync(
    join(repositoryRoot, "node_modules", "@playwright", "cli"),
  );
  const cliRequire = createRequire(join(cliDir, "package.json"));
  const cliPkg = readJson(cliRequire.resolve("./package.json")) as {
    name: string;
    version: string;
  };
  const corePath = cliRequire.resolve("playwright-core/package.json");
  const coreDir = join(corePath, "..");
  const corePkg = readJson(corePath) as { version: string };
  const browsers = JSON.parse(
    readFileSync(join(coreDir, "browsers.json"), "utf8"),
  ) as {
    browsers: ReadonlyArray<{ name: string; revision: string }>;
  };
  const find = (name: string): string | null =>
    browsers.browsers.find((b) => b.name === name)?.revision ?? null;
  return {
    cli: { name: cliPkg.name, version: cliPkg.version },
    playwrightRuntime: { version: corePkg.version },
    chromiumRevision: find("chromium"),
    chromiumHeadlessShellRevision: find("chromium-headless-shell"),
  };
}

async function writeToolchainManifest(
  artifactDirectory: string,
): Promise<void> {
  await writeFile(
    join(artifactDirectory, "toolchain.json"),
    `${JSON.stringify(toolchainIdentity(), null, 2)}\n`,
  );
}

export async function createLaneRunner(lane: string): Promise<LaneRunner> {
  const artifactDirectory = join(repositoryRoot, "output", "playwright", lane);
  await mkdir(artifactDirectory, { recursive: true });
  const session = `bundar-${lane}`;
  const pwcli = resolvePlaywrightCli(process.env).path;
  await writeToolchainManifest(artifactDirectory);

  const run = async (
    name: string,
    args: string[],
    required = true,
  ): Promise<number> => {
    const command = [pwcli, `-s=${session}`, ...args];
    const processHandle = Bun.spawn(command, {
      cwd: artifactDirectory,
      env: { ...process.env, PLAYWRIGHT_CLI_SESSION: session },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(processHandle.stdout).text(),
      new Response(processHandle.stderr).text(),
      processHandle.exited,
    ]);
    await writeFile(join(artifactDirectory, `${name}.stdout.txt`), stdout);
    await writeFile(join(artifactDirectory, `${name}.stderr.txt`), stderr);
    await writeFile(
      join(artifactDirectory, `${name}.command.txt`),
      `$ ${command.join(" ")}\n`,
    );
    if (required && exitCode !== 0)
      throw new Error(
        `${name} failed with exit ${exitCode}: ${stderr || stdout}`,
      );
    return exitCode;
  };

  return { run, artifactDirectory };
}

/**
 * Runs an in-page assertion. `body` is the source of an async function
 * (e.g. `async () => { ... }`) evaluated in the page; it must return a
 * truthy value or throw — failures surface as nonzero CLI exit with the
 * thrown message archived under `<label>.stderr.txt`.
 */
export async function assertInPage(
  runner: LaneRunner,
  label: string,
  body: string,
): Promise<void> {
  const wrapped =
    `async page => { const message = await page.evaluate(async () => { ` +
    `try { return "OK:" + String(await (${body})()); } ` +
    `catch (error) { return "FAIL:" + (error && error.message ? error.message : String(error)); } }); ` +
    `if (message.startsWith("FAIL:")) throw new Error(${JSON.stringify(label)} + ": " + message.slice(5)); ` +
    `return message.slice(3); }`;
  await runner.run(label, ["run-code", wrapped]);
}
