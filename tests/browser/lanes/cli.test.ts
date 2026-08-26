import { describe, expect, test } from "bun:test";
import { resolvePlaywrightCli, toolchainIdentity } from "./cli";
import { join } from "node:path";

describe("playwright CLI resolution (BR-091 + BR-099)", () => {
  test("explicit override wins", () => {
    const resolved = resolvePlaywrightCli({
      BUNDAR_PLAYWRIGHT_CLI: "/opt/cli/pw.sh",
    });
    expect(resolved.source).toBe("override");
    expect(resolved.path).toBe("/opt/cli/pw.sh");
  });

  test("default resolution is the pinned local binary — no npx, no codex fallback", () => {
    const resolved = resolvePlaywrightCli({});
    // On a properly installed tree the pinned local binary exists; when it
    // does not, resolution must FAIL CLOSED rather than degrade to npx.
    if (resolved.source === "local-pinned") {
      expect(resolved.path).toBe(
        join(process.cwd(), "node_modules", ".bin", "playwright-cli"),
      );
    } else {
      throw new Error("expected fail-closed resolution error");
    }
  });

  test("empty HOME/CODEX_HOME cannot resurrect any fallback (BR-099)", () => {
    const resolved = resolvePlaywrightCli({ HOME: "", CODEX_HOME: "" });
    expect(["override", "local-pinned"]).toContain(resolved.source);
    expect(JSON.stringify(resolved)).not.toContain("npx");
    expect(JSON.stringify(resolved)).not.toContain(".codex");
  });

  test("toolchain identity resolves from installed lockfile packages", () => {
    const identity = toolchainIdentity();
    expect(identity.cli.name).toBe("@playwright/cli");
    expect(identity.cli.version).toBe("0.1.18");
    expect(identity.playwrightRuntime.version).toBe("1.63.0-alpha-2026-08-05");
    expect(identity.chromiumRevision).not.toBeNull();
  });
});
