/**
 * GH-072 integration: the documented dev loop, end to end through the
 * real CLI binary —
 *
 * 1. `bundar dev --entry <app>` spawns `bun --hot` and the app announces
 *    its port;
 * 2. editing the route file hot-swaps the response on the SAME port with
 *    the SAME process (no duplicate listeners);
 * 3. a syntax error prints diagnostics and keeps the previously-loaded
 *    code serving; fixing the file applies the new version;
 * 4. SIGINT stops the CLI, which forwards to the child and exits 0
 *    (clean shutdown).
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const CLI_BIN = join(import.meta.dir, "..", "..", "src", "bin.ts");

interface DevLoop {
  readonly entryPath: string;
  readonly port: number;
  alive(): boolean;
  stop(): Promise<{ code: number }>;
}

function appSource(version: string): string {
  return `const server = Bun.serve({ port: 0, fetch: () => new Response("${version}") });
console.log("DEV_READY port=" + server.port);`;
}

async function startDevLoop(): Promise<DevLoop> {
  const dir = mkdtempSync(join(tmpdir(), "bundar-devloop-"));
  const entryPath = join(dir, "app.ts");
  writeFileSync(entryPath, appSource("v1"));

  const child = spawn(
    process.execPath,
    [CLI_BIN, "dev", "--entry", entryPath],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  const deadline = Date.now() + 20_000;
  let port = 0;
  while (Date.now() < deadline) {
    const match = output.match(/DEV_READY port=(\d+)/);
    if (match !== null) {
      port = Number(match[1]);
      break;
    }
    if (child.exitCode !== null) {
      throw new Error(`dev loop exited early (${child.exitCode}): ${output}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (port === 0) throw new Error(`dev loop never became ready: ${output}`);
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    entryPath,
    port,
    alive: () => child.exitCode === null && child.signalCode === null,
    stop: () =>
      new Promise((resolve) => {
        child.once("exit", (code) => resolve({ code: code ?? -1 }));
        child.kill("SIGINT");
      }),
  };
}

async function waitFor(
  get: () => Promise<string | null>,
  predicate: (value: string) => boolean,
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let last: string | null = null;
  while (Date.now() < deadline) {
    last = await get();
    if (last !== null && predicate(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `waitFor: condition not met within ${timeoutMs}ms (last: ${last})`,
  );
}

describe("GH-072 dev loop (integration)", () => {
  test("edit → hot swap on the same port; syntax error → old code serves; SIGINT → clean stop", async () => {
    const loop = await startDevLoop();
    const get = async (): Promise<string | null> => {
      try {
        const response = await fetch(`http://127.0.0.1:${loop.port}/`);
        return await response.text();
      } catch {
        return null;
      }
    };

    // 1. initial version serves
    expect(await waitFor(get, (body) => body === "v1")).toBe("v1");

    // 2. edit the route file → hot swap, same port, same CLI process
    writeFileSync(loop.entryPath, appSource("v2"));
    expect(await waitFor(get, (body) => body === "v2")).toBe("v2");

    // 3. syntax error → diagnostics visible, old code keeps serving,
    //    the dev command stays up (no crash, no duplicate listeners)
    writeFileSync(loop.entryPath, appSource("v3").replace("});", ";;"));
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    expect(await get()).toBe("v2");
    expect(loop.alive()).toBe(true);

    // 4. fixing the file applies the new version
    writeFileSync(loop.entryPath, appSource("v3"));
    expect(await waitFor(get, (body) => body === "v3")).toBe("v3");

    // 5. SIGINT → the CLI forwards and exits 0 (clean dev shutdown)
    const { code } = await loop.stop();
    expect(code).toBe(0);
  }, 90_000);
});
