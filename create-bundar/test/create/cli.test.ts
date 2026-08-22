/**
 * GH-071 CLI coverage: non-interactive flag flow, defaults, unknown
 * dialects, usage text, the experimental notice, and the interactive
 * path driven by an injected prompt.
 */
import { describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCreateBundar } from "../../src/cli";

function tempTarget(label: string): string {
  return join(tmpdir(), `bundar-cli-${label}-${Date.now()}`);
}

describe("GH-071 runCreateBundar (non-interactive)", () => {
  test("no target prints usage and exits 1", async () => {
    const lines: string[] = [];
    const code = await runCreateBundar({
      args: [],
      flags: {},
      out: (line) => lines.push(line),
    });
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("usage:");
  });

  test("default dialect scaffolds htmx2 successfully", async () => {
    const target = tempTarget("ok");
    const lines: string[] = [];
    const code = await runCreateBundar({
      args: [target],
      flags: {},
      out: (line) => lines.push(line),
    });
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("bun run dev");
    expect(lines.join("\n")).not.toContain("EXPERIMENTAL");
    rmSync(target, { recursive: true, force: true });
  });

  test("experimental dialect prints the prominent notice", async () => {
    const target = tempTarget("exp");
    const lines: string[] = [];
    const code = await runCreateBundar({
      args: [target, "--dialect", "htmx4-experimental"],
      flags: {},
      out: (line) => lines.push(line),
    });
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("EXPERIMENTAL DIALECT SELECTED");
    expect(lines.join("\n")).toContain("No GA compatibility claim");
    rmSync(target, { recursive: true, force: true });
  });

  test("unknown dialect fails with the supported list", async () => {
    const lines: string[] = [];
    const code = await runCreateBundar({
      args: [tempTarget("never"), "--dialect", "htmx9"],
      flags: {},
      out: (line) => lines.push(line),
    });
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("htmx4-experimental");
  });

  test("interactive prompt flow: asked for target and dialect", async () => {
    const target = tempTarget("tty");
    const questions: string[] = [];
    const code = await runCreateBundar({
      args: [],
      flags: {},
      interactive: true,
      prompt: async (question) => {
        questions.push(question);
        return questions.length === 1 ? target : "htmx2";
      },
      out: () => {},
    });
    expect(code).toBe(0);
    expect(questions[0]).toContain("directory");
    expect(questions[1]).toContain("Dialect");
    rmSync(target, { recursive: true, force: true });
  });
});
