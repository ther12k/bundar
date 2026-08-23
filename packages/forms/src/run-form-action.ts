/**
 * Progressive validated form-action orchestration (BR-015; GH-060 origin).
 *
 * Composes ONE submission pipeline: bounded form parsing (GH-057), Standard
 * Schema validation (GH-058), field-error data with safe value retention
 * (GH-059), and exactly-once success execution inside transaction hooks.
 * Response DELIVERY is fully delegated to the caller's FormResponseAdapter
 * (ADR-0018 §3) — this module never touches protocol headers, so the same
 * runtime serves htmx and any future presentation layer. Identical business
 * validation runs for ordinary and enhanced flows.
 */
import { parseForm, type Context } from "@bundar/core";
import { toFieldErrors, validateSchema } from "@bundar/schema";
import type { ValidationResult } from "@bundar/schema";
import {
  INVALID_SUBMISSION_STATUS,
  type FormActionDefinition,
  type FormActionOutcome,
  type FormResponseAdapter,
  type InvalidFormRender,
  type RetainedValues,
} from "./contracts";

export { INVALID_SUBMISSION_STATUS };

/** Extracts first/submitted values per field from the bounded parse. */
function submittedValues(
  form: Awaited<ReturnType<typeof parseForm>>,
): Record<string, string | string[]> {
  const submitted: Record<string, string | string[]> = {};
  for (const field of form.fields) {
    if (field.name in submitted) continue;
    const values = form.getAll(field.name);
    submitted[field.name] = values.length > 1 ? [...values] : values[0]!;
  }
  return submitted;
}

/**
 * Runs the validated form action for one request: parse → validate →
 * (invalid) hand the adapter ready-made renderer data, or (valid) run the
 * success handler exactly once inside the transaction hooks — fragment
 * resolved BEFORE commit so business failures roll back — then hand the
 * adapter the resolved fragment + delivery options.
 */
export async function executeFormAction<Output>(
  context: Context,
  definition: FormActionDefinition<Output>,
  adapter: FormResponseAdapter,
): Promise<FormActionOutcome> {
  // 1. bounded parse (single consumption; the schema sees decoded data)
  const form = await parseForm(context);
  const submitted = submittedValues(form);

  // 2. identical business validation for both worlds
  const result: ValidationResult<Output> = await validateSchema(
    definition.schema,
    submitted,
  );

  // 3. invalid: adapter renders the form region (or document) with safe data
  if (!result.success) {
    const model = toFieldErrors(result, { submitted });
    const render: InvalidFormRender = {
      errors: model,
      submitted: model.submitted as RetainedValues,
      firstErrorField: model.first[0]?.field ?? null,
    };
    const response = await adapter.invalid(context.request, {
      status: INVALID_SUBMISSION_STATUS,
      message: "Validation failed",
      render,
      formTarget: definition.formTarget,
    });
    return { kind: "invalid", response };
  }

  // 4. valid: exactly-once success path inside the transaction hooks
  let handle: unknown;
  if (definition.transaction !== undefined) {
    handle = await definition.transaction.begin();
  }
  let fragment: unknown;
  try {
    fragment = await definition.buildFragment(result.value);
  } catch (error) {
    if (definition.transaction !== undefined) {
      await definition.transaction.rollback(handle);
    }
    throw error;
  }
  if (definition.transaction !== undefined) {
    await definition.transaction.commit(handle);
  }

  const response = await adapter.valid(context.request, {
    fragment,
    delivery: definition.delivery ?? {},
  });
  return { kind: "valid", response };
}
