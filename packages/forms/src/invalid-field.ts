/**
 * Framework-neutral invalid-field view helper (GH-182).
 *
 * One boring, explicit accessor over an {@link InvalidFormRender}: the
 * submitted values retained for a field and that field's own ordered
 * errors. Exists to keep duplicate/multi-value submissions observable —
 * `value` exposes the first submission while `values` and `multiple`
 * preserve the rest, so application code never reaches for `String(value)`
 * and accidentally renders "a,b" for a two-submission field. Error and
 * redaction ownership stay where they belong: field messages come only
 * from `FieldErrorModel.fields` (globals never leak into a field), and
 * sensitive-value redaction remains the retained-values policy upstream.
 */
import type { InvalidFormRender } from "./contracts";

/** Everything a template needs to render one invalid field's state. */
export interface InvalidFieldView {
  /** First submitted value; `undefined` when the field was not submitted. */
  readonly value: string | undefined;
  /** Every submitted value in submission order. */
  readonly values: readonly string[];
  /** True only when the field carries more than one submitted value. */
  readonly multiple: boolean;
  /** This field's validation messages in original issue order. */
  readonly errors: readonly string[];
  /** The field's first validation message, if any. */
  readonly error: string | undefined;
  /** True when the field has at least one validation message. */
  readonly invalid: boolean;
}

/** The empty view for a field with no submitted values and no errors. */
function unsubmitted(errors: readonly string[]): InvalidFieldView {
  return {
    value: undefined,
    values: [],
    multiple: false,
    errors,
    error: errors[0],
    invalid: errors.length > 0,
  };
}

/**
 * Builds the view for one field of an invalid submission. Absent and empty
 * retained values render as missing; an array keeps every element visible
 * in submission order with `multiple: true`.
 */
export function invalidField(
  render: InvalidFormRender,
  name: string,
): InvalidFieldView {
  const errors: readonly string[] = render.errors.fields[name] ?? [];
  const submitted = render.submitted[name];
  if (submitted === undefined) {
    return unsubmitted(errors);
  }
  if (Array.isArray(submitted)) {
    if (submitted.length === 0) {
      return unsubmitted(errors);
    }
    return {
      value: submitted[0],
      values: [...submitted],
      multiple: submitted.length > 1,
      errors,
      error: errors[0],
      invalid: errors.length > 0,
    };
  }
  return {
    value: submitted,
    values: [submitted],
    multiple: false,
    errors,
    error: errors[0],
    invalid: errors.length > 0,
  };
}
