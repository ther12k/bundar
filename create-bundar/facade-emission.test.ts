/**
 * GH-186 emission assertions: the scaffolder's generated application must
 * teach the separated form-action facade — and must not carry the legacy
 * patterns the new API replaces. Static checks over the emitted sources;
 * behavior is covered by the scaffold/template/cleanroom suites.
 */
import { describe, expect, test } from "bun:test";
import { minimalTemplate } from "./templates/minimal";
import type { TemplateContext } from "./templates/shared";

const context: TemplateContext = {
  name: "starter-fixture",
  dialect: "htmx2",
};

describe("GH-186 generated starter uses the separated facade", () => {
  const app = minimalTemplate.files["src/app.ts"](context);

  test("imports and binds createFormActions / defineFormAction", () => {
    expect(app).toContain("createFormActions({ dialect })");
    expect(app).toContain("defineFormAction({");
    expect(app).toContain("forms.handle(subscribe)");
  });

  test("emits the separated workflow shape", () => {
    expect(app).toContain("run: ({ email })");
    expect(app).toContain("success: {");
    expect(app).toContain("invalid: {");
    expect(app).toContain('field("email").error');
  });

  test("carries no legacy form-action smells", () => {
    expect(app).not.toContain("runFormAction(");
    expect(app).not.toContain("action.fragment");
    expect(app).not.toContain("String(render.submitted");
    expect(app).not.toContain("errors.first");
    expect(app).not.toContain("parseForm");
  });

  test("generated dependencies are unchanged (no schema library added)", () => {
    const pkg = minimalTemplate.files["package.json"](context);
    expect(pkg).toContain('"@bundar/htmx": "workspace:*"');
    expect(/"(zod|valibot|yup)"/.test(pkg)).toBe(false);
  });
});
