/**
 * BR-045 fixture tests: budgets, logical-line counting, exceptions, and
 * the historical 329-line mixed app.ts regression case.
 */
import { describe, expect, test } from "bun:test";
import {
  checkComplexity,
  countLogicalLines,
  countTopLevelDeclarations,
  kindOf,
  type ComplexityConfig,
  type SourceFile,
} from "../../tools/app-complexity/engine";

const file = (path: string, source: string): SourceFile => ({ path, source });

function lines(n: number, seed = "export const x = 1;"): string {
  return Array.from({ length: n }, (_, i) => `${seed} // ${i}`).join("\n");
}

describe("BR-045 complexity budgets", () => {
  test("kind classification covers every named layer", () => {
    expect(kindOf("src/features/todos/todos.routes.tsx")).toBe("routes");
    expect(kindOf("src/ui.view.tsx")).toBe("view");
    expect(kindOf("src/table.components.tsx")).toBe("components");
    expect(kindOf("src/subscribe.actions.ts")).toBe("actions");
    expect(kindOf("src/subscribe.schema.ts")).toBe("schema");
    expect(kindOf("src/todos.types.ts")).toBe("types");
    expect(kindOf("src/todos.repository.ts")).toBe("repository");
    expect(kindOf("src/app.ts")).toBe("composition");
    expect(kindOf("src/features/todos/AGENTS.md")).toBe("map");
    expect(kindOf("src/routes.gen.ts")).toBe("other");
  });

  test("logical lines exclude blanks and comments", () => {
    const source = [
      "// leading comment",
      "export const a = 1;",
      "",
      "/* block",
      "   comment */",
      "export const b = 2; // trailing",
    ].join("\n");
    expect(countLogicalLines(source)).toBe(2);
    expect(countTopLevelDeclarations(source)).toBe(2);
  });

  test("generated files, snapshots, and data tables are excluded explicitly", () => {
    const violations = checkComplexity({}, [
      file("src/routes.gen.ts", lines(900)),
      file("src/fixtures.snapshot.ts", lines(900)),
      file("src/seeds.data.ts", lines(900)),
      file("src/types.d.ts", lines(900)),
    ]);
    expect(violations).toEqual([]);
  });

  test("soft breaches warn without failing; hard breaches fail", () => {
    const config: ComplexityConfig = {};
    const softOnly = checkComplexity(config, [
      file("src/features/x/x.routes.ts", lines(200)), // soft 150 < 200 <= hard 300
    ]);
    expect(softOnly.map((v) => v.severity)).toEqual(["soft"]);
    expect(softOnly[0]!.rule).toBe("size-budget-soft");

    const hard = checkComplexity(config, [
      file("src/features/x/x.routes.ts", lines(400)),
    ]);
    expect(hard.map((v) => v.rule)).toEqual(["size-budget-hard"]);
    // remedy is structural, never just "file too long"
    expect(hard[0]!.message).toContain("split handlers per operation");
  });

  test("the old 329-line mixed todo app.ts would trigger the checker", () => {
    // Reconstructed shape of the audited file: composition + routes +
    // schema + views in ONE module (classified as composition at src root).
    const mixedAppTs = [
      "import { App } from '@bundar/core';",
      ...Array.from({ length: 329 }, (_, i) => `export const line${i} = ${i};`),
    ].join("\n");
    const violations = checkComplexity({}, [
      file("examples/todo/src/app.ts", mixedAppTs),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.severity).toBe("hard");
    expect(violations[0]!.message).toContain(
      "register feature route modules instead of defining handlers inline",
    );
  });

  test("approved exceptions downgrade to warnings until reviewDate expires", () => {
    const config: ComplexityConfig = {
      exceptions: [
        {
          path: "src/features/x/x.routes.ts",
          owner: "team",
          reason: "pending split",
          reviewDate: "2999-01-01",
        },
      ],
    };
    const active = checkComplexity(config, [
      file("src/features/x/x.routes.ts", lines(400)),
    ]);
    expect(active.map((v) => v.rule)).toEqual(["size-budget-soft"]);

    const expired: ComplexityConfig = {
      ...config,
      exceptions: [{ ...config.exceptions![0]!, reviewDate: "2020-01-01" }],
    };
    const lapsed = checkComplexity(expired, [
      file("src/features/x/x.routes.ts", lines(200)), // only SOFT size, but expired exception
    ]);
    expect(lapsed.map((v) => v.rule)).toEqual(["size-budget-hard"]);
  });

  test("deterministic output ordering across runs", () => {
    const files = [
      file("src/b.actions.ts", lines(300)),
      file("src/a.view.tsx", lines(300)),
    ];
    const first = JSON.stringify(checkComplexity({}, files));
    const second = JSON.stringify(checkComplexity({}, files));
    expect(first).toBe(second);
  });
});
