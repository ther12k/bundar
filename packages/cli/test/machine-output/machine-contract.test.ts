/**
 * BR-046 machine-output contract tests: envelope shape and determinism,
 * documented exit codes, no ANSI in JSON, prompts prohibition, dry-run.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEnvelope, EXIT, stripAnsi } from "../../src/machine";
import { runCliWithEnvelope, type CliEnvelopeV1 } from "../../src/cli";

function parseEnvelope(stdout: string): CliEnvelopeV1 {
  return JSON.parse(stdout) as CliEnvelopeV1;
}

describe("BR-046 machine output contract", () => {
  test("envelope key order and values are deterministic", () => {
    const a = buildEnvelope({
      command: "doctor",
      exitCode: EXIT.ok,
      warnings: ["w1"],
      data: { bun: "1.4.0" },
      next: ["bundar routes generate"],
    });
    const b = buildEnvelope({
      command: "doctor",
      exitCode: EXIT.ok,
      warnings: ["w1"],
      data: { bun: "1.4.0" },
      next: ["bundar routes generate"],
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // fixed top-level key order
    expect(Object.keys(a)).toEqual([
      "schema",
      "ok",
      "command",
      "exitCode",
      "warnings",
      "errors",
      "data",
      "next",
    ]);
    expect(a.schema).toBe("bundar.cli/1");
    expect(a.ok).toBe(true);
  });

  test("stripAnsi removes all escape sequences; JSON stays clean", () => {
    const dirty =
      "\u001b[31mred\u001b[0m plain \u001b]8;;http://x\u0007link\u001b]8;;\u0007";
    expect(stripAnsi(dirty)).toBe("red plain link");
    const envelope = buildEnvelope({
      command: "t",
      exitCode: EXIT.ok,
      warnings: [dirty],
    });
    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toContain("\u001b");
    expect(serialized).not.toContain("\u0007");
  });

  test("doctor --json emits one stable envelope with suggested next", async () => {
    const first = await runCliWithEnvelope(["doctor", "--json"]);
    const second = await runCliWithEnvelope(["doctor", "--json"]);
    expect(first.exitCode).toBe(EXIT.ok);
    expect(first.envelope).not.toBeNull();
    // identical input → byte-identical envelope
    expect(JSON.stringify(first.envelope)).toBe(
      JSON.stringify(second.envelope),
    );
    const envelope = parseEnvelope(JSON.stringify(first.envelope));
    expect(envelope.command).toBe("doctor");
    expect(envelope.next).toContain("bundar routes generate");
    const data = envelope.data as Record<string, string>;
    expect(Object.keys(data)).toEqual([
      "bundar",
      "bun",
      "platform",
      "arch",
      "tty",
    ]);
  });

  test("info remains an alias of doctor with identical envelope", async () => {
    const doctor = await runCliWithEnvelope(["doctor", "--json"]);
    const info = await runCliWithEnvelope(["info", "--json"]);
    expect(info.envelope).toEqual(doctor.envelope);
  });

  test("unknown command exits 1 (usage) with errors listed", async () => {
    const result = await runCliWithEnvelope([
      "definitely-not-a-command",
      "--json",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.envelope?.ok).toBe(false);
    expect(result.envelope?.errors.join(" ")).toContain("unknown command");
  });

  test("invalid command input exits with the documented usage code", async () => {
    const result = await runCliWithEnvelope([
      "htmx-audit",
      "/nonexistent-path-xyz",
    ]);
    expect(result.exitCode).toBe(EXIT.usage);
  });

  test("handler exceptions exit 3 (execution failure)", async () => {
    const { registerCommand } = await import("../../src/cli");
    registerCommand({
      name: "__test-boom",
      description: "test-only",
      handler: () => {
        throw new Error("boom");
      },
    });
    const result = await runCliWithEnvelope(["__test-boom", "--json"]);
    expect(result.exitCode).toBe(EXIT.execution);
    expect(result.envelope?.errors.join(" ")).toContain("boom");
  });

  test("global flags are consumed by the framework, not forwarded", async () => {
    let seen: string[] = [];
    const originalLog = console.log;
    console.log = (...parts: unknown[]) => {
      seen = parts.map(String);
    };
    try {
      await runCliWithEnvelope(["--quiet", "--no-color", "doctor"]);
    } finally {
      console.log = originalLog;
    }
    // quiet human mode still prints diagnostics line(s); flags never leak
    expect(seen.join("\n")).not.toContain("--quiet");
  });

  test("dry-run leaves a fixture tree byte-identical (hash-verified)", async () => {
    const dir = join(tmpdir(), `bundar-dryrun-${Date.now()}`);
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "app.ts"), "export default {};\n");
    const before = readFileSync(join(dir, "src", "app.ts"));

    // htmx-audit is read-only; the flag must be inert for safe commands
    const result = await runCliWithEnvelope([
      "htmx-audit",
      join(dir, "src"),
      "--dry-run",
    ]);
    expect([EXIT.ok, EXIT.usage]).toContain(result.exitCode as 0 | 1);

    const after = readFileSync(join(dir, "src", "app.ts"));
    expect(after.equals(before)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
