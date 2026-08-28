/**
 * GH-180 `ExecutableFormActionDefinition` type tests.
 *
 * The `Expect`/`Equal` members and `@ts-expect-error` blocks are enforced by
 * `tsc --noEmit` (root and package typechecks). Bun's test discovery does not
 * match `.test-d.ts` filenames, so this file is re-registered for normal runs
 * by the sibling wrapper `executable-form-action.test.ts`; the runtime anchors
 * below keep the suite observable under `bun test`.
 */
import { describe, expect, test } from "bun:test";
import type { StandardSchema } from "@bundar/schema";
import type {
  ExecutableFormActionDefinition,
  FormActionDefinition,
  FormWorkflowContext,
  InvalidFormRender,
} from "../../src/index";
import type { Equal, Expect } from "./type-utils";

/** Local inference helper: Input and Result must flow through unchanged. */
function defineExecutableFormAction<Input, Result>(
  definition: ExecutableFormActionDefinition<Input, Result>,
): ExecutableFormActionDefinition<Input, Result> {
  return definition;
}

/** Minimal conforming schema fixture with a distinct Input type. */
const signupSchema: StandardSchema<unknown, { email: string }> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: () => ({ value: { email: "ada@example.test" } }),
  },
};

/** The domain result type produced by the fixture's business action. */
type SignupResult = { userId: number; ranAt: string };

describe("GH-180 ExecutableFormActionDefinition type contract", () => {
  test("the contract surface is exactly the intentional keys (no wire concepts)", () => {
    const surfaceIsClosed: Expect<
      Equal<
        keyof ExecutableFormActionDefinition<unknown, unknown>,
        | "schema"
        | "validation"
        | "run"
        | "buildFragment"
        | "delivery"
        | "renderForm"
        | "formTarget"
        | "transaction"
      >
    > = true;
    expect(surfaceIsClosed).toBe(true);
  });

  test("Input and Result are inferred separately and handed to the right hooks", () => {
    const definition = defineExecutableFormAction({
      schema: signupSchema,
      run: (input, context) => {
        const inputIsValidatedEmail: Expect<
          Equal<typeof input, { email: string }>
        > = true;
        const contextIsWorkflowContext: Expect<
          Equal<typeof context, FormWorkflowContext>
        > = true;
        expect(inputIsValidatedEmail).toBe(true);
        expect(contextIsWorkflowContext).toBe(true);
        return { userId: input.email.length, ranAt: context.request.url };
      },
      buildFragment: (result, context) => {
        const resultIsDomainResult: Expect<
          Equal<typeof result, SignupResult>
        > = true;
        const contextIsWorkflowContext: Expect<
          Equal<typeof context, FormWorkflowContext>
        > = true;
        expect(resultIsDomainResult).toBe(true);
        expect(contextIsWorkflowContext).toBe(true);
        return `user:${result.userId}@${context.request.url}`;
      },
      renderForm: (render, context) => {
        const renderIsInvalidRender: Expect<
          Equal<typeof render, InvalidFormRender>
        > = true;
        const contextIsWorkflowContext: Expect<
          Equal<typeof context, FormWorkflowContext>
        > = true;
        expect(renderIsInvalidRender).toBe(true);
        expect(contextIsWorkflowContext).toBe(true);
        return `${String(render.firstErrorField)}:${context.request.method}`;
      },
    });
    expect(definition.schema).toBe(signupSchema);
  });

  test("run() input must be the validated Input, not an unrelated shape", () => {
    defineExecutableFormAction<{ email: string }, SignupResult>({
      schema: signupSchema,
      // @ts-expect-error — run receives the VALIDATED INPUT from the schema
      run: (input: { emailAddress: string }) => ({
        userId: input.emailAddress.length,
        ranAt: "test",
      }),
      buildFragment: () => null,
      renderForm: () => null,
    });
  });

  test("success rendering receives the domain result, never validated input", () => {
    defineExecutableFormAction<{ email: string }, SignupResult>({
      schema: signupSchema,
      run: () => ({ userId: 1, ranAt: "test" }),
      // @ts-expect-error — buildFragment takes the RESULT, not the Input
      buildFragment: (result: { email: string }) => result.email,
      renderForm: () => null,
    });
  });

  test("Result is inferred from run()'s return, not from the schema's Input", () => {
    defineExecutableFormAction({
      schema: signupSchema,
      run: () => ({ userId: 7 }),
      buildFragment: (result) => {
        const resultIsUserIdRecord: Expect<
          Equal<typeof result, { userId: number }>
        > = true;
        expect(resultIsUserIdRecord).toBe(true);
        return `user:${result.userId}`;
      },
      renderForm: () => null,
    });
  });

  test("the legacy FormActionDefinition remains source-compatible and distinct", () => {
    const legacy: FormActionDefinition<{ email: string }> = {
      schema: signupSchema,
      buildFragment: (output) => output.email,
      renderForm: (render) => render.firstErrorField,
    };
    const legacyShapeUnchanged: Expect<
      Equal<typeof legacy, FormActionDefinition<{ email: string }>>
    > = true;
    expect(legacyShapeUnchanged).toBe(true);
    // The legacy shape does NOT silently satisfy the executable contract:
    // separating Input from Result requires an explicit run().
    // @ts-expect-error — a legacy definition has no run() to execute
    defineExecutableFormAction({
      schema: legacy.schema,
      buildFragment: legacy.buildFragment,
      renderForm: legacy.renderForm,
    });
  });
});
