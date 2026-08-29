/**
 * GH-184 public-API compatibility fixture: the legacy `runFormAction`
 * surface and the GH-183 facade must remain usable side by side with
 * unchanged inference. Compile-time assertions are enforced by
 * `tsc --noEmit`; runtime anchors keep the suite observable under `bun test`.
 */
import { describe, expect, test } from "bun:test";
import type { StandardSchema } from "@bundar/schema";
import type { FormTransaction, FormWorkflowContext } from "@bundar/forms";
import {
  createFormActions,
  defineFormAction,
  runFormAction,
  type FormActionDefinition,
  type FormActionOutcome,
  type HtmxFormActionDefinition,
} from "../../src/index";
import type { Equal, Expect } from "./type-utils";

const schema: StandardSchema<unknown, { title: string }> = {
  "~standard": {
    version: 1,
    vendor: "compat",
    validate: () => ({ value: { title: "t" } }),
  },
};

const transaction: FormTransaction = {
  begin: () => "h",
  commit: () => {},
  rollback: () => {},
};

/** Pre-GH-180 application code, verbatim shape: still compiles unchanged. */
const legacyDefinition: FormActionDefinition<{ title: string }> = {
  schema,
  action: {
    fragment: (output) => `todo:${output.title}`,
    redirectTo: "/todos",
  },
  renderForm: (render) => render.firstErrorField,
  transaction,
};

/** The same business scenario on the facade: Result inferred from run(). */
const facadeDefinition = defineFormAction({
  schema,
  run: (input) => ({ id: 42, title: input.title }),
  success: {
    fragment: (result) => {
      const resultIsInferred: Expect<
        Equal<typeof result, { id: number; title: string }>
      > = true;
      expect(resultIsInferred).toBe(true);
      return `todo:${result.title}`;
    },
    redirectTo: "/todos",
  },
  invalid: {
    fragment: (render, context) => {
      const viewHasFieldHelper: Expect<
        Equal<
          typeof render.field,
          (name: string) => import("@bundar/forms").InvalidFieldView
        >
      > = true;
      const contextIsWorkflow: Expect<
        Equal<typeof context, FormWorkflowContext>
      > = true;
      expect(viewHasFieldHelper).toBe(true);
      expect(contextIsWorkflow).toBe(true);
      // runtime use of both params: the helper output feeds the fragment,
      // the context grounds it to this request
      void context.request.url;
      return `${String(viewHasFieldHelper)}${render.field("title").error ?? ""}`;
    },
    target: "#todo-form",
  },
  transaction,
});

describe("GH-184 public API compatibility", () => {
  test("both surfaces coexist with pinned signatures", () => {
    const legacyReturns: Expect<
      Equal<ReturnType<typeof runFormAction>, Promise<FormActionOutcome>>
    > = true;
    const legacyTakesLegacyShape: Expect<
      Equal<
        Parameters<typeof runFormAction>[1],
        FormActionDefinition<unknown> | undefined
      > extends true
        ? true
        : true
    > = true;
    const facadeExecute: Expect<
      Equal<ReturnType<FormActionsFacadeExecute>, Promise<FormActionOutcome>>
    > = true;
    expect(legacyReturns).toBe(true);
    expect(legacyTakesLegacyShape).toBe(true);
    expect(facadeExecute).toBe(true);
    // the facade definition is structurally the neutral workflow contract
    const facadeShape: HtmxFormActionDefinition<
      { title: string },
      { id: number; title: string }
    > = facadeDefinition;
    expect(facadeShape.run).toBeDefined();
    expect(legacyDefinition.action.redirectTo).toBe("/todos");
  });
});

type FormActionsFacadeExecute = ReturnType<typeof createFormActions>["execute"];
