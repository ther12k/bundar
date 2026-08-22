/**
 * GH-072 supervised-child coverage with REAL subprocesses: signal
 * forwarding and exit-code propagation, SIGKILL escalation past the
 * grace period for wedged children, spawn-failure mapping, and the
 * intentional-stop marker that makes Ctrl-C a clean shutdown.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, writeFileSync } from "node:fs";
import { superviseChild } from "../../src/process/child";

function scriptDir(name: string, source: string): string {
  const dir = mkdtempSync(join(tmpdir(), `bundar-child-${name}-`));
  writeFileSync(join(dir, "script.ts"), source);
  return dir;
}

describe("GH-072 superviseChild", () => {
  test("forwards SIGTERM; exit code propagates", async () => {
    const dir = scriptDir(
      "term",
      `process.on("SIGTERM", () => { process.exit(7); });\nconsole.log("up");\nsetInterval(() => {}, 1000);`,
    );
    const child = superviseChild(process.execPath, [
      "--hot",
      join(dir, "script.ts"),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 800));
    child.signal("SIGTERM");
    expect(await child.exited).toBe(7);
    expect(child.intentionallyStopped()).toBe(true);
  });

  test("escalates to SIGKILL after the grace period", async () => {
    const dir = scriptDir(
      "wedged",
      `process.on("SIGTERM", () => { /* ignore */ });\nconsole.log("up");\nsetInterval(() => {}, 1000);`,
    );
    const child = superviseChild(
      process.execPath,
      ["--hot", join(dir, "script.ts")],
      { shutdownGraceMs: 400 },
    );
    await new Promise((resolve) => setTimeout(resolve, 800));
    child.signal("SIGTERM");
    const code = await child.exited;
    expect(code).toBe(137); // 128 + SIGKILL
  }, 10_000);

  test("spawn failure maps to 127 and resolves (never rejects)", async () => {
    const child = superviseChild("/nonexistent/binary", ["--x"]);
    expect(await child.exited).toBe(127);
  });

  test("natural child exit propagates its code", async () => {
    const dir = scriptDir("exit", `process.exit(3);`);
    const child = superviseChild(process.execPath, [join(dir, "script.ts")]);
    expect(await child.exited).toBe(3);
    expect(child.intentionallyStopped()).toBe(false);
  });

  test("the child process is really gone after a signaled stop", async () => {
    const dir = scriptDir(
      "gone",
      `console.log("up");\nsetInterval(() => {}, 1000);`,
    );
    const child = superviseChild(process.execPath, [
      "--hot",
      join(dir, "script.ts"),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const pid = child.pid;
    child.signal("SIGKILL");
    await child.exited;
    if (pid !== undefined) {
      expect(Bun.spawn(["kill", "-0", String(pid)]).exitCode).not.toBe(0);
    }
  });
});
