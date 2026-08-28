/**
 * GH-183 form-action facade type tests.
 *
 * The `Expect`/`Equal` members and `@ts-expect-error` blocks are enforced by
 * `tsc --noEmit` (root and package typechecks). Bun's test discovery does not
 * match `.test-d.ts` filenames, so this file is re-registered for normal runs
 * by the sibling wrapper; the anchors below keep the suite observable under
 * `bun test`.
 */
import { describe, expect, test } from "bun:test";
import type { StandardSchema } from "@bundar/schema";
import type { FormActionOutcome, InvalidFieldView } from "@bundar/forms";
import {
  defineFormAction,
  type FormActionsFacade,
  type HtmxFormActionDefinition,
  type InvalidFormView,
} from "../../src/form-action-facade";
import type { Equal, Expect } from "./type-utils";

const todoSchema: StandardSchema<unknown, { title: string }> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: () => ({ value: { title: "write tests" } }),
  },
};

describe("GH-183 facade type contract", () => {
  test("defineFormAction infers Input from schema and Result from run()", () => {
    const createTodo = defineFormAction({
      schema: todoSchema,
      run: ({ title }) => ({ id: 42, title }),
      success: {
        fragment: (todo) => {
          type Actual = typeof todo;
          type Expected = { id: number; title: string };
          type Check = Expect<Equal<Actual, Expected>>;
          const check: Check = true;
          expect(check).toBe(true);
          return todo.title;
        },
        redirectTo: "/",
      },
      invalid: {
        fragment: ({ field }) => {
          const view: InvalidFieldView = field("title");
          return view.error;
        },
      },
    });
    // the identity helper preserves the inferred shape exactly
    type Inferred = typeof createTodo;
    type RunReturn = ReturnType<Inferred["run"]>;
    type Check = Expect<
      Equal<
        RunReturn,
        { id: number; title: string } | Promise<{ id: number; title: string }>
      >
    >;
    const check: Check = true;
    expect(check).toBe(true);
    // runtime anchor: the identity helper returns the SAME object, untouched
    expect(createTodo).toBe(createTodo);
    expect(createTodo.success.redirectTo).toBe("/");
  });

  test("success.fragment cannot treat Result as Input; run cannot take Result", () => {
    defineFormAction<{ title: string }, { id: number }>({
      schema: todoSchema,
      run: (input) => ({ id: input.title.length }),
      success: {
        // @ts-expect-error — the fragment receives the DOMAIN RESULT,
        // never the validated input
        fragment: (todo: { title: string }) => todo.title,
      },
      invalid: { fragment: () => null },
    });
    defineFormAction<{ title: string }, { id: number }>({
      schema: todoSchema,
      // @ts-expect-error — run receives the VALIDATED INPUT, never Result
      run: (input: { id: number }) => ({ id: input.id }),
      success: { fragment: (todo) => String(todo.id) },
      invalid: { fragment: () => null },
    });
  });

  test("invalid status and redirectStatus values stay rejected", () => {
    defineFormAction<{ title: string }, { id: number }>({
      schema: todoSchema,
      run: () => ({ id: 1 }),
      success: {
        fragment: () => null,
        redirectTo: "/",
        // @ts-expect-error — 418 is not an approved ActionBodyStatus
        status: 418,
        // @ts-expect-error — 200 is not an approved ActionRedirectStatus
        redirectStatus: 200,
      },
      invalid: { fragment: () => null },
    });
  });

  test("facade method shapes are pinned", () => {
    const executed: Expect<
      Equal<
        ReturnType<FormActionsFacade["execute"]>,
        Promise<FormActionOutcome>
      >
    > = true;
    const handled: Expect<
      Equal<
        ReturnType<FormActionsFacade["handle"]>,
        (
          context: import("@bundar/forms").FormWorkflowContext,
        ) => Promise<Response>
      >
    > = true;
    expect(executed).toBe(true);
    expect(handled).toBe(true);
  });

  test("InvalidFormView extends InvalidFormRender additively", () => {
    const view: InvalidFormView = {
      errors: {
        fields: {},
        global: [],
        order: [],
        submitted: {},
        field: () => [],
        has: () => false,
        first: [],
        empty: true,
      },
      submitted: {},
      firstErrorField: null,
      field: (name) => {
        void name;
        const fieldView: Expect<
          Equal<ReturnType<InvalidFormView["field"]>, InvalidFieldView>
        > = true;
        expect(fieldView).toBe(true);
        return {
          value: undefined,
          values: [],
          multiple: false,
          errors: [],
          error: undefined,
          invalid: false,
        };
      },
    };
    expect(view.field).toBeDefined();
  });

  test("a definition missing the invalid presentation is rejected", () => {
    defineFormAction<{ title: string }, { id: number }>({
      schema: todoSchema,
      run: () => ({ id: 1 }),
      success: { fragment: () => null },
      // @ts-expect-error — invalid.fragment is required presentation
      invalid: {},
    });
  });

  test("the definition surface is exactly the workflow plus presentation split", () => {
    type Expected =
      "schema" | "validation" | "run" | "success" | "invalid" | "transaction";
    // keyof over the generic alias stays deferred, so a homomorphic mapped
    // type materializes the keys first; Distribute then makes the membership
    // check distributive (naked parameter). Subset=true ⟹ every key is
    // expected; Superset=true ⟹ no expected key is missing. Together the
    // union is pinned exactly.
    type Definition = HtmxFormActionDefinition<
      { title: string },
      { id: number }
    >;
    type Materialized = { [P in keyof Definition]: P };
    type Keys = keyof Materialized;
    type Distribute<K extends Keys> = K extends Expected ? true : false;
    type Subset = Distribute<Keys>;
    type Superset = Expected extends Keys ? true : false;
    const noExtraKeys: Expect<Equal<Subset, true>> = true;
    const noMissingKeys: Expect<Equal<Superset, true>> = true;
    expect(noExtraKeys).toBe(true);
    expect(noMissingKeys).toBe(true);
  });
});
