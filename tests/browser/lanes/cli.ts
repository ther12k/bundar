/**
 * Shared playwright-cli lane runner for BR-075 lanes (accessibility,
 * no-JS): same invocation contract as tests/browser/run.ts — every step's
 * stdout/stderr/command is archived, and required steps throw on nonzero.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..", "..", "..");

export interface LaneRunner {
  run(name: string, args: string[], required?: boolean): Promise<number>;
  artifactDirectory: string;
}

export async function createLaneRunner(lane: string): Promise<LaneRunner> {
  const artifactDirectory = join(repositoryRoot, "output", "playwright", lane);
  await mkdir(artifactDirectory, { recursive: true });
  const session = `bundar-${lane}`;
  const home = process.env.HOME ?? "/tmp";
  const codexHome = process.env.CODEX_HOME ?? join(home, ".codex");
  const pwcli = join(
    codexHome,
    "skills",
    "playwright",
    "scripts",
    "playwright_cli.sh",
  );

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
