import { describe, expect, test } from "bun:test";
import {
  BUNDAR_VERSION,
  parseArgs,
  registerCommand,
  runCli,
} from "../src/index";

describe("GH-070 @bundar/cli command framework", () => {
  test("parses arguments and flags correctly", () => {
    const parsed = parseArgs([
      "info",
      "--verbose",
      "-h",
      "--port=3000",
      "--host",
      "localhost",
    ]);
    expect(parsed.commandName).toBe("info");
    expect(parsed.flags["verbose"]).toBe(true);
    expect(parsed.flags["h"]).toBe(true);
    expect(parsed.flags["port"]).toBe("3000");
    expect(parsed.flags["host"]).toBe("localhost");
  });

  test("runs help and version with exit code 0", async () => {
    expect(await runCli(["--help"])).toBe(0);
    expect(await runCli(["-h"])).toBe(0);
    expect(await runCli(["--version"])).toBe(0);
    expect(await runCli(["-v"])).toBe(0);
    expect(await runCli([])).toBe(0);
  });

  test("runs info command with exit code 0", async () => {
    expect(await runCli(["info"])).toBe(0);
  });

  test("returns exit code 1 on unknown command", async () => {
    expect(await runCli(["nonexistent-command-xyz"])).toBe(1);
  });

  test("allows custom command registration", async () => {
    let executed = false;
    registerCommand({
      name: "custom-test-cmd",
      description: "Custom test command",
      handler: () => {
        executed = true;
        return 0;
      },
    });

    const code = await runCli(["custom-test-cmd"]);
    expect(code).toBe(0);
    expect(executed).toBe(true);
  });

  test("version constant is defined", () => {
    expect(BUNDAR_VERSION).toBe("0.0.0");
  });
});
