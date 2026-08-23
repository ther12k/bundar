/**
 * BR-048 tests: bounded context packs — kind-based exclusions, golden
 * determinism, budget fail-closed with override, secrets exclusion.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const REPO = join(import.meta.dir, "../../../..");
const BIN = join(REPO, "packages/cli/src/bin.ts");

interface RunResult {
  stdout: string;
  status: number;
}

function run(args: string[]): RunResult {
  const proc = Bun.spawnSync(["bun", BIN, "agent-context", ...args], {
    cwd: REPO,
    stdout: "pipe",
    stderr: "pipe",
  });
  return { stdout: proc.stdout.toString(), status: proc.exitCode ?? 0 };
}

describe("BR-048 agent-context packs", () => {
  test("UI pack excludes repository implementation but keeps view models", () => {
    const result = run([
      "todos",
      "--app",
      "examples/todo",
      "--kind",
      "ui",
      "--json",
    ]);
    expect(result.status).toBe(0);
    const pack = (
      JSON.parse(result.stdout) as {
        data: {
          writablePaths: string[];
          readOnlyEvidence: string[];
          publicApis: string[];
        };
      }
    ).data;
    expect(pack.writablePaths.some((f) => f.includes(".view."))).toBe(true);
    expect(pack.writablePaths.some((f) => f.includes(".repository."))).toBe(
      false,
    );
    // view models and contracts remain visible as evidence
    expect(pack.readOnlyEvidence.some((f) => f.includes(".types."))).toBe(true);
    expect(pack.publicApis.join("\n")).toContain("todoItem");
  });

  test("action pack excludes JSX/HTMX sources while keeping ports", () => {
    const result = run([
      "todos",
      "--app",
      "examples/todo",
      "--kind",
      "actions",
      "--json",
    ]);
    const pack = (
      JSON.parse(result.stdout) as {
        data: {
          writablePaths: string[];
          readOnlyEvidence: string[];
          directDependencies: string[];
        };
      }
    ).data;
    expect(
      pack.writablePaths.some(
        (f) => /\.repository\.$/.test(f) || f.endsWith("todos.repository.ts"),
      ),
    ).toBe(true);
    expect(pack.writablePaths.some((f) => f.includes(".view."))).toBe(false);
    expect(pack.readOnlyEvidence.some((f) => f.includes(".routes."))).toBe(
      true,
    );
    const deps = pack.directDependencies.join(" ");
    expect(deps).not.toContain("@bundar/jsx");
  });

  test("no secret-like or artifact paths can appear in any pack", () => {
    for (const kind of ["ui", "actions"]) {
      const output = run([
        "todos",
        "--app",
        "examples/todo",
        "--kind",
        kind,
        "--json",
      ]).stdout;
      expect(output).not.toMatch(/\.env|credentials|node_modules|dist\//);
    }
  });

  test("output is deterministic (golden equality across runs)", () => {
    const args = ["todos", "--app", "examples/todo", "--kind", "ui", "--json"];
    expect(run(args).stdout).toBe(run(args).stdout);
  });

  test("budget fails closed without override; --max-bytes overrides", () => {
    const tiny = run([
      "todos",
      "--app",
      "examples/todo",
      "--kind",
      "actions",
      "--max-bytes",
      "10",
    ]);
    expect(tiny.status).toBe(1);

    const generous = run([
      "todos",
      "--app",
      "examples/todo",
      "--kind",
      "actions",
      "--max-bytes",
      "999999",
      "--json",
    ]);
    expect(generous.status).toBe(0);
  });

  test("md format renders sections; unknown feature exits 1", () => {
    const md = run([
      "todos",
      "--app",
      "examples/todo",
      "--kind",
      "ui",
      "--format",
      "md",
    ]);
    expect(md.stdout).toContain("# todos — ui context");
    expect(md.stdout).toContain("## Writable paths");

    const missing = run(["nonexistent", "--app", "examples/todo"]);
    expect(missing.status).toBe(1);
  });
});
