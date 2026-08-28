import { describe, expect, test } from "bun:test";
import { toFieldErrors, type ValidationResult } from "@bundar/schema";
import type { InvalidFormRender } from "../src/index";
import { invalidField } from "../src/invalid-field";

/** Builds a real FieldErrorModel through the schema package's own policy. */
function render(
  issues: ReadonlyArray<{
    path: ReadonlyArray<PropertyKey>;
    message: string;
  }>,
  submitted: Record<string, unknown>,
): InvalidFormRender {
  const result = { success: false, issues } as ValidationResult<never>;
  const model = toFieldErrors(result, { submitted });
  return {
    errors: model,
    submitted: model.submitted,
    firstErrorField: model.first[0]?.field ?? null,
  };
}

describe("GH-182 invalidField view helper", () => {
  test("a missing submitted value renders as missing", () => {
    const view = invalidField(
      render([{ path: ["title"], message: "is required" }], {}),
      "title",
    );
    expect(view.value).toBeUndefined();
    expect(view.values).toEqual([]);
    expect(view.multiple).toBe(false);
    expect(view.error).toBe("is required");
    expect(view.errors).toEqual(["is required"]);
    expect(view.invalid).toBe(true);
  });

  test("a scalar submission stays scalar (no accidental array)", () => {
    const view = invalidField(
      render([{ path: ["title"], message: "too long" }], {
        title: "hello",
      }),
      "title",
    );
    expect(view.value).toBe("hello");
    expect(view.values).toEqual(["hello"]);
    expect(view.multiple).toBe(false);
  });

  test("duplicate submissions keep every value observable in order", () => {
    const view = invalidField(
      render([{ path: ["tag"], message: "too many" }], {
        tag: ["first", "second"],
      }),
      "tag",
    );
    // the central guarantee: value is the FIRST submission — never a
    // String()-coerced comma-joined accident like "first,second"
    expect(view.value).toBe("first");
    expect(view.values).toEqual(["first", "second"]);
    expect(view.multiple).toBe(true);
  });

  test("an empty submission array renders as missing, errors still attached", () => {
    const view = invalidField(
      render([{ path: ["tag"], message: "is required" }], { tag: [] }),
      "tag",
    );
    expect(view.value).toBeUndefined();
    expect(view.values).toEqual([]);
    expect(view.multiple).toBe(false);
    expect(view.invalid).toBe(true);
  });

  test("redacted sensitive keys are absent upstream and render as missing", () => {
    const view = invalidField(
      render([{ path: ["password"], message: "is required" }], {
        password: "hunter2",
        display_name: "Ada",
      }),
      "password",
    );
    // redaction policy dropped the key before the helper ever saw it
    expect(view.value).toBeUndefined();
    expect(view.values).toEqual([]);
    expect(view.multiple).toBe(false);
    expect(view.invalid).toBe(true);
  });

  test("field errors keep their original order; error is the first", () => {
    const view = invalidField(
      render(
        [
          { path: ["title"], message: "is required" },
          { path: ["other"], message: "unrelated" },
          { path: ["title"], message: "too short" },
        ],
        {},
      ),
      "title",
    );
    expect(view.errors).toEqual(["is required", "too short"]);
    expect(view.error).toBe("is required");
  });

  test("global errors never leak into a field's errors", () => {
    const view = invalidField(
      render(
        [
          { path: [], message: "form is broken" },
          { path: [], message: "also global" },
        ],
        {},
      ),
      "title",
    );
    expect(view.errors).toEqual([]);
    expect(view.error).toBeUndefined();
    expect(view.invalid).toBe(false);
  });

  test("a clean field among invalid ones reports invalid: false", () => {
    const view = invalidField(
      render([{ path: ["other"], message: "unrelated" }], {
        title: "fine",
      }),
      "title",
    );
    expect(view.invalid).toBe(false);
    expect(view.error).toBeUndefined();
    expect(view.value).toBe("fine");
  });

  test("an unknown field name behaves as missing and clean", () => {
    const view = invalidField(render([], {}), "nope");
    expect(view.value).toBeUndefined();
    expect(view.values).toEqual([]);
    expect(view.multiple).toBe(false);
    expect(view.errors).toEqual([]);
    expect(view.error).toBeUndefined();
    expect(view.invalid).toBe(false);
  });
});
