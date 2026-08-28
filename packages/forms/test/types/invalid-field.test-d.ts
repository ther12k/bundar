/**
 * GH-182 invalidField type tests.
 *
 * The `Expect`/`Equal` members and `@ts-expect-error` blocks are enforced by
 * `tsc --noEmit` (root and package typechecks). Bun's test discovery does not
 * match `.test-d.ts` filenames, so this file is re-registered for normal runs
 * by the sibling wrapper; the anchors below keep the suite observable under
 * `bun test`.
 */
import { describe, expect, test } from "bun:test";
import { invalidField, type InvalidFieldView } from "../../src/invalid-field";
import type { Equal, Expect } from "./type-utils";

describe("GH-182 invalidField type contract", () => {
  test("the view members carry the promised types", () => {
    const view: InvalidFieldView = invalidField(
      {
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
      },
      "title",
    );
    const valueIsOptionalString: Expect<
      Equal<typeof view.value, string | undefined>
    > = true;
    const valuesAreReadonlyStrings: Expect<
      Equal<typeof view.values, readonly string[]>
    > = true;
    const multipleIsBoolean: Expect<Equal<typeof view.multiple, boolean>> =
      true;
    const errorsAreReadonlyStrings: Expect<
      Equal<typeof view.errors, readonly string[]>
    > = true;
    const errorIsOptionalString: Expect<
      Equal<typeof view.error, string | undefined>
    > = true;
    const invalidIsBoolean: Expect<Equal<typeof view.invalid, boolean>> = true;
    expect(valueIsOptionalString).toBe(true);
    expect(valuesAreReadonlyStrings).toBe(true);
    expect(multipleIsBoolean).toBe(true);
    expect(errorsAreReadonlyStrings).toBe(true);
    expect(errorIsOptionalString).toBe(true);
    expect(invalidIsBoolean).toBe(true);
    // runtime anchor: a clean view with all-empty members
    expect(view.invalid).toBe(false);
  });

  test("a record without the InvalidFormRender shape is rejected", () => {
    const notARender = { submitted: {}, firstErrorField: null };
    try {
      // @ts-expect-error — the helper requires a full InvalidFormRender
      invalidField(notARender, "title");
    } catch {
      // The assertion is compile-time rejection; at runtime a record without
      // an error model legitimately throws before anything observable.
    }
  });
});
