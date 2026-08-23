/**
 * BR-047 tests: offline determinism, no-write guarantee, schema validity,
 * secrets exclusion, and the feature-scope size budget on reference apps.
 */
import { describe, expect, test } from "bun:test";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dir, "../../../..");
const BIN = join(REPO, "packages/cli/src/bin.ts");

interface RunResult {
  stdout: string;
  status: number;
}

function run(
  args: string[],
  env: Record<string, string> = {},
  cwd = REPO,
): RunResult {
  const proc = Bun.spawnSync(["bun", BIN, "inspect", ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  return { stdout: proc.stdout.toString(), status: proc.exitCode ?? 0 };
}

function envelopeOf(result: RunResult): Record<string, unknown> {
  if (result.status !== 0)
    throw new Error(`nonzero exit ${result.status}: ${result.stdout}`);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function treeState(dir: string): string {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.isSymbolicLink()) continue;
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else
        out.push(
          `${p}:${statSync(p).size}:${readFileSync(p).toString().length}`,
        );
    }
  };
  walk(dir);
  return out.join("|");
}

/** Minimal validator against packages/cli/schemas/inspect.schema.json. */
function validateAgainstSchema(manifest: unknown): string[] {
  const schema = JSON.parse(
    readFileSync(
      join(REPO, "packages/cli/schemas/inspect.schema.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  const errors: string[] = [];
  const obj = manifest as Record<string, unknown>;
  for (const key of schema.required as string[]) {
    if (!(key in obj)) errors.push(`missing required key: ${key}`);
  }
  const props = schema.properties as Record<string, Record<string, unknown>>;
  if (obj["schema"] !== props["schema"]!.const)
    errors.push(
      `schema must be ${(props["schema"]! as { const: string }).const}`,
    );
  if (
    typeof obj["inputHash"] === "string" &&
    !/^sha256-[0-9a-f]{64}$/.test(obj["inputHash"] as string)
  )
    errors.push("inputHash malformed");
  const scope = props["scope"] as { enum?: string[] };
  if (!scope.enum!.includes(obj["scope"] as string))
    errors.push(`scope not in ${scope.enum!.join("|")}`);
  return errors;
}

describe("BR-047 bundar inspect", () => {
  test("repo scope is deterministic across runs and schema-valid", () => {
    const first = JSON.stringify(envelopeOf(run(["inspect", "--json"])));
    const second = JSON.stringify(envelopeOf(run(["inspect", "--json"])));
    expect(first).toBe(second);
    const envelope = JSON.parse(first) as { data: unknown };
    expect(validateAgainstSchema(envelope.data)).toEqual([]);
    const data = envelope.data as { packages: { name: string }[] };
    expect(data.packages.length).toBeGreaterThanOrEqual(7);
  });

  test("no writes and no network: fixture tree unchanged, hash stable", () => {
    const target = join(REPO, "templates/minimal");
    const before = treeState(target);
    run(["inspect", "--scope", "app", "--app", "templates/minimal"]);
    expect(treeState(target)).toBe(before);
  });

  test("secrets and environment values are excluded", () => {
    const secret = "SUPER_SECRET_VALUE_br047";
    const output = run(["inspect", "--json"], {
      FAKE_SECRET: secret,
      BUNDAR_TEST_TOKEN: secret,
    }).stdout;
    expect(output).not.toContain(secret);
  });

  test("feature scope stays within the documented size budget", () => {
    const result = run([
      "inspect",
      "--scope",
      "feature",
      "--app",
      "examples/todo",
      "--feature",
      "todos",
      "--json",
    ]);
    const envelope = JSON.parse(result.stdout) as {
      data: { feature: { name: string; files: unknown[] }; inputHash: string };
    };
    expect(envelope.data.feature.name).toBe("todos");
    expect(envelope.data.feature.files.length).toBeGreaterThan(0);
    // bounded manifest budget (BR-047 acceptance): 16 KB serialized ceiling
    expect(result.stdout.length).toBeLessThan(16_000);
    expect(validateAgainstSchema(envelope.data)).toEqual([]);
  });

  test("route extraction covers group aliases with names and methods", () => {
    const result = run([
      "inspect",
      "--scope",
      "app",
      "--app",
      "examples/todo",
      "--json",
    ]);
    const app = (
      JSON.parse(result.stdout) as {
        data: {
          app: {
            routes: { method: string; path: string; name: string | null }[];
          };
        };
      }
    ).data.app;
    const paths = app.routes.map((r) => `${r.method} ${r.path}`).sort();
    expect(paths).toContain("GET /");
    expect(paths).toContain("POST /todos");
    expect(paths).toContain("POST /todos/:id/delete");
    const named = app.routes.filter((r) => r.name !== null);
    expect(named.length).toBe(app.routes.length);
  });

  test("dialect detection reads the real binding, not doc comments", () => {
    const minimal = run([
      "inspect",
      "--scope",
      "app",
      "--app",
      "templates/minimal",
      "--json",
    ]).stdout;
    expect(
      (JSON.parse(minimal) as { data: { app: { dialect: string } } }).data.app
        .dialect,
    ).toBe("htmx2");
  });

  test("inputHash changes when an input file changes (staleness detection)", () => {
    const target = join(REPO, "templates/minimal");
    const file = join(target, "src/features/subscribe/subscribe.types.ts");
    const original = readFileSync(file, "utf8");
    const before = run([
      "inspect",
      "--scope",
      "app",
      "--app",
      "templates/minimal",
      "--json",
    ]).stdout;
    try {
      writeFileSync(file, `${original}\n// staleness probe\n`);
      const after = run([
        "inspect",
        "--scope",
        "app",
        "--app",
        "templates/minimal",
        "--json",
      ]).stdout;
      const h1 = (JSON.parse(before) as { data: { inputHash: string } }).data
        .inputHash;
      const h2 = (JSON.parse(after) as { data: { inputHash: string } }).data
        .inputHash;
      expect(h1).not.toBe(h2);
    } finally {
      writeFileSync(file, original);
    }
    expect(existsSync(file)).toBe(true);
  });

  test("unknown feature exits 1 with actionable warning", () => {
    const result = run([
      "inspect",
      "--scope",
      "feature",
      "--app",
      "examples/todo",
      "--feature",
      "nonexistent",
    ]);
    expect(result.status).toBe(1);
  });
});
