/**
 * GH-181 executor type tests.
 *
 * The `Expect`/`Equal` members and `@ts-expect-error` blocks are enforced by
 * `tsc --noEmit` (root and package typechecks). Bun's test discovery does not
 * match `.test-d.ts` filenames, so this file is re-registered for normal runs
 * by the sibling wrapper; the anchors below keep the suite observable under
 * `bun test`.
 */
import { describe, expect, test } from "bun:test";
import type { StandardSchema } from "@bundar/schema";
import type {
  ExecutableFormActionDefinition,
  FormActionOutcome,
} from "../../src/index";
import { executeExecutableFormAction } from "../../src/run-executable-form-action";
import type { Equal, Expect } from "./type-utils";

type SignupInput = { email: string };
type SignupResult = { userId: number };

const signupSchema: StandardSchema<unknown, SignupInput> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: () => ({ value: { email: "ada@example.test" } }),
  },
};

describe("GH-181 executor type contract", () => {
  test("Input and Result are inferred separately through the executor", () => {
    const definition: ExecutableFormActionDefinition<
      SignupInput,
      SignupResult
    > = {
      schema: signupSchema,
      run: (input) => {
        const inputIsEmail: Expect<Equal<typeof input, SignupInput>> = true;
        expect(inputIsEmail).toBe(true);
        return { userId: input.email.length };
      },
      buildFragment: (result) => {
        const resultIsUserId: Expect<Equal<typeof result, SignupResult>> = true;
        expect(resultIsUserId).toBe(true);
        return `user:${String(result.userId)}`;
      },
      renderForm: () => null,
    };
    // The executor is generic over the SAME definition type: instantiating it
    // with distinct Input/Result typechecks only when both flow through.
    type Executor = typeof executeExecutableFormAction<
      SignupInput,
      SignupResult
    >;
    const takesDefinition: Expect<
      Equal<
        Parameters<Executor>[1],
        ExecutableFormActionDefinition<SignupInput, SignupResult>
      >
    > = true;
    expect(takesDefinition).toBe(true);
    const returnsOutcome: Expect<
      Equal<ReturnType<Executor>, Promise<FormActionOutcome>>
    > = true;
    expect(returnsOutcome).toBe(true);
    expect(definition.schema).toBe(signupSchema);
  });

  test("a legacy definition without run() cannot reach the executor", () => {
    const legacy = {
      schema: signupSchema,
      buildFragment: (output: SignupInput) => output.email,
      renderForm: () => null,
    };
    // The assertion is compile-time rejection; the call itself returns a
    // rejected promise (placeholder context), consumed here because the
    // runtime behavior of a type-invalid call is not under test.
    executeExecutableFormAction<SignupInput, SignupResult>(
      undefined as never,
      // @ts-expect-error — the separated executor requires run(); the
      // legacy shape stays valid only for the legacy executor.
      legacy,
      undefined as never,
    ).catch(() => undefined);
  });
});
