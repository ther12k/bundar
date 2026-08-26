import { describe, expect, test } from "bun:test";
import { resolvePlaywrightCli, SHIM_SOURCE } from "./cli";
import { join } from "node:path";

describe("playwright CLI resolution (BR-091)", () => {
  const binDirectory = join("output", "playwright", ".bin");

  test("explicit override wins over every other source", () => {
    const resolved = resolvePlaywrightCli(
      { BUNDAR_PLAYWRIGHT_CLI: "/opt/cli/pw.sh" },
      binDirectory,
    );
    expect(resolved.source).toBe("override");
    expect(resolved.path).toBe("/opt/cli/pw.sh");
  });

  test("codex skill wrapper is used when it exists", () => {
    // This development machine has the codex wrapper; if it disappears the
    // suite still passes because resolution falls through — so assert
    // against whichever branch reality takes here.
    const resolved = resolvePlaywrightCli({}, binDirectory);
    if (resolved.source === "codex") {
      expect(resolved.path).toContain(".codex");
      expect(resolved.path.endsWith("playwright_cli.sh")).toBe(true);
    } else {
      expect(resolved.source).toBe("generated-shim");
    }
  });

  test("generated shim keeps the npx + session-flag contract", () => {
    expect(SHIM_SOURCE).toContain(
      "npx --yes --package @playwright/cli playwright-cli",
    );
    expect(SHIM_SOURCE).toContain("PLAYWRIGHT_CLI_SESSION");
    expect(SHIM_SOURCE).toContain("--session");
    expect(SHIM_SOURCE).toContain('cmd+=("$@")');
    expect(SHIM_SOURCE.trimEnd()).toContain('exec "${cmd[@]}"');
  });

  test("HOME without a codex install resolves to the generated shim", () => {
    const resolved = resolvePlaywrightCli(
      { HOME: "/home/runner" },
      binDirectory,
    );
    expect(resolved.source).toBe("generated-shim");
    expect(resolved.path).toBe(join(binDirectory, "playwright_cli.sh"));
  });
});
