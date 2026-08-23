/**
 * BR-023 fixture tests: application feature-boundary engine rules across
 * valid, invalid, aliased, type-only, dynamic, and relative imports.
 */
import { describe, expect, test } from "bun:test";
import {
  checkAppBoundaries,
  type AppConfig,
  type AppFile,
} from "../../tools/app-architecture/engine";

const sliced: AppConfig = { root: "src", mode: "feature-sliced" };

const file = (path: string, source: string): AppFile => ({ path, source });

function violationsFor(files: AppFile[], config: AppConfig = sliced) {
  return checkAppBoundaries(config, files);
}

describe("BR-023 app boundary engine", () => {
  test("a clean feature slice passes", () => {
    const violations = violationsFor([
      file("src/features/todos/todos.types.ts", "export interface Todo {}"),
      file(
        "src/features/todos/todos.repository.ts",
        `import type { Todo } from "./todos.types";\nexport const repo = {};`,
      ),
      file(
        "src/features/todos/todos.actions.ts",
        `import type { Todo } from "./todos.types";\nimport { validateForm } from "@bundar/forms";\nexport const toggle = (t: Todo) => t;`,
      ),
      file(
        "src/features/todos/todos.view.tsx",
        `import type { Todo } from "./todos.types";\nexport const row = (t: Todo) => null;`,
      ),
      file(
        "src/features/todos/todos.routes.ts",
        `import { toggle } from "./todos.actions";\nimport { row } from "./todos.view";\nexport const handler = () => row;`,
      ),
      file(
        "src/platform/session.ts",
        `import { htmx2 } from "@bundar/htmx/2";`,
      ),
    ]);
    expect(violations).toEqual([]);
  });

  test("a domain file importing @bundar/jsx fails", () => {
    const violations = violationsFor([
      file(
        "src/features/todos/todos.types.ts",
        `import { jsx } from "@bundar/jsx";\nexport interface Todo {}`,
      ),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["domain-purity"]);
  });

  test("an action importing the kernel or HTMX fails; documented adapters pass", () => {
    const base: AppFile[] = [
      file(
        "src/features/todos/todos.actions.ts",
        `import { parseForm } from "@bundar/core";\nimport { view } from "@bundar/htmx";\nexport const x = 1;`,
      ),
    ];
    const violations = violationsFor(base);
    expect(violations.map((v) => v.rule)).toEqual([
      "action-ui-import",
      "action-ui-import",
    ]);

    const withAdapter: AppConfig = {
      ...sliced,
      allowedImports: { "todos.actions.ts": ["../platform/http-port"] },
    };
    expect(
      violationsFor(
        [
          file(
            "src/features/todos/todos.actions.ts",
            `import { respond } from "../platform/http-port";\nexport const x = 1;`,
          ),
        ],
        withAdapter,
      ),
    ).toEqual([]);
  });

  test("actions constructing Request/Response fail", () => {
    const violations = violationsFor([
      file(
        "src/features/todos/todos.actions.ts",
        `export const bad = () => new Response("no");`,
      ),
    ]);
    expect(violations.map((v) => v.rule)).toEqual(["action-http-construction"]);
  });

  test("routes may import another feature's actions but not its repository", () => {
    const files: AppFile[] = [
      file(
        "src/features/billing/billing.repository.ts",
        `export const billingRepo = {};`,
      ),
      file(
        "src/features/todos/todos.routes.ts",
        `import { invoiceCount } from "../billing/billing.types";\nimport { billingRepo } from "../billing/billing.repository";\nexport const handler = billingRepo;`,
      ),
    ];
    const violations = violationsFor(files);
    expect(violations.map((v) => v.rule)).toEqual(["cross-feature-repository"]);
  });

  test("views never import actions or repositories — even their own", () => {
    const violations = violationsFor([
      file(
        "src/features/todos/todos.actions.ts",
        `export const toggle = () => 1;`,
      ),
      file("src/features/todos/todos.repository.ts", `export const repo = {};`),
      file(
        "src/features/todos/todos.view.tsx",
        `import { toggle } from "./todos.actions";\nimport { repo } from "./todos.repository";\nexport const page = [toggle, repo];`,
      ),
    ]);
    expect(new Set(violations.map((v) => v.rule))).toEqual(
      new Set(["view-behavior-import"]),
    );
    expect(violations).toHaveLength(2);
  });

  test("type-only, dynamic, aliased-package, and relative imports are all inspected", () => {
    const violations = violationsFor([
      // type-only kernel import in actions still fails
      file(
        "src/features/todos/todos.actions.ts",
        `import type { Context } from "@bundar/core";\nexport const x = 1;`,
      ),
      // dynamic import of jsx in a repository
      file(
        "src/features/todos/todos.repository.ts",
        `export async function lazy() { return await import("@bundar/jsx"); }`,
      ),
      // subpath alias of htmx in actions
      file(
        "src/features/todos/todos.actions.ts",
        `import { directives } from "@bundar/htmx/2";\nexport const y = 2;`,
      ),
    ]);
    expect(violations.length).toBe(3);
    expect(violations.every((v) => v.message.length > 0)).toBe(true);
  });

  test("compact mode applies the same layers without features directories", () => {
    const config: AppConfig = { root: "src", mode: "compact" };
    const violations = violationsFor(
      [
        file("src/types.ts", `import { jsx } from "@bundar/jsx";`),
        file("src/actions.ts", `export const ok = 1;`),
        file(
          "src/ui.tsx",
          `import { ok } from "./actions";\nexport const view = ok;`,
        ),
      ],
      config,
    );
    expect(violations.map((v) => v.rule)).toEqual(["domain-purity"]);
  });

  test("output is deterministic across repeated runs", () => {
    const files: AppFile[] = [
      file(
        "src/features/todos/todos.actions.ts",
        `import "@bundar/core";\nimport "@bundar/jsx";`,
      ),
    ];
    const a = JSON.stringify(violationsFor(files));
    const b = JSON.stringify(violationsFor(files));
    expect(a).toBe(b);
  });
});
