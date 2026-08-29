/**
 * GH-187 documentation claims: the docs must present the separated
 * form-action facade as the preferred application-level API, copied from
 * the ACTUAL migrated Todo and generated starter — and canonical examples
 * must not carry the legacy patterns the facade replaces.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string): string =>
  readFileSync(join(import.meta.dir, "..", "..", p), "utf8");

/** Prose reflows under Prettier — claims match on normalized whitespace. */
const has = (haystack: string, needle: string): boolean =>
  haystack.replace(/\s+/g, " ").includes(needle.replace(/\s+/g, " "));

describe("GH-187 form-action documentation claims", () => {
  test("README presents the facade as preferred, with the compatibility note", () => {
    const readme = read("README.md");
    expect(has(readme, "defineFormAction()")).toBe(true);
    expect(has(readme, "createFormActions()")).toBe(true);
    expect(
      has(readme, "remains available as the lower-level compatibility surface"),
    ).toBe(true);
  });

  test("getting-started teaches the facade, not the legacy call", () => {
    const gs = read("docs/getting-started.md");
    expect(has(gs, "createFormActions")).toBe(true);
    expect(has(gs, "defineFormAction")).toBe(true);
    expect(has(gs, "forms.handle(")).toBe(true);
    expect(gs.includes("runFormAction")).toBe(false);
  });

  test("canonical guide documents the contract and the handle/execute split", () => {
    const guide = read("docs/guides/form-actions.md");
    expect(has(guide, "run(input, context)")).toBe(true);
    expect(has(guide, "success.fragment(result, context)")).toBe(true);
    expect(has(guide, "forms.handle(createTodo)")).toBe(true);
    expect(has(guide, "forms.execute(context, createTodo)")).toBe(true);
    expect(
      has(guide, "remains supported as the low-level/legacy surface"),
    ).toBe(true);
  });

  test("migration guide is mechanical, with the compatibility statement", () => {
    const migration = read("docs/guides/form-action-migration.md");
    expect(migration.includes("runFormAction(")).toBe(true); // before-example
    expect(has(migration, "defineFormAction({")).toBe(true);
    expect(has(migration, "invalid.fragment")).toBe(true);
    expect(has(migration, "invalid.document")).toBe(true);
    expect(has(migration, "invalid.target")).toBe(true);
    expect(has(migration, "field(name).error")).toBe(true);
    expect(has(migration, "pre-1.0 compatibility window")).toBe(true);
  });

  test("validation guide documents multi-value behavior and the anti-pattern", () => {
    const validation = read("docs/guides/validation.md");
    for (const member of [
      "value",
      "values",
      "multiple",
      "error",
      "errors",
      "invalid",
    ]) {
      expect(has(validation, `title.${member}`)).toBe(true);
    }
    expect(validation.includes("String(render.submitted")).toBe(true);
    expect(has(validation, "never silently comma-joined")).toBe(true);
    expect(has(validation, "redaction policy")).toBe(true);
  });

  test("todo walkthrough documents mutation/result/render separation", () => {
    const todo = read("docs/examples/todo.md");
    expect(has(todo, "run: ({ title }, context)")).toBe(true);
    expect(has(todo, "success.fragment")).toBe(true);
    expect(has(todo, "RenameTodoResult")).toBe(true);
    expect(has(todo, "not validated forms")).toBe(true);
  });

  test("architecture guide states the package boundary", () => {
    const architecture = read("docs/guides/architecture.md");
    expect(architecture.includes("@bundar/forms")).toBe(true);
    expect(architecture.includes("neutral workflow")).toBe(true);
    expect(architecture.includes("@bundar/htmx")).toBe(true);
    expect(has(architecture, "inference-friendly definition helper")).toBe(
      true,
    );
  });

  test("preferred-path snippets carry the facade, none of the legacy smells", () => {
    for (const path of [
      "docs/snippets/forms.ts",
      "docs/snippets/guides/getting-started-form.ts",
    ]) {
      const snippet = read(path);
      expect(has(snippet, "defineFormAction({")).toBe(true);
      expect(has(snippet, "createFormActions({ dialect")).toBe(true);
      expect(snippet.includes("runFormAction(")).toBe(false);
      expect(snippet.includes("String(render.submitted")).toBe(false);
      expect(snippet.includes("errors.first")).toBe(false);
      expect(snippet.includes(".then((outcome) => outcome.response)")).toBe(
        false,
      );
    }
  });
});
