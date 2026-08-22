/**
 * Input-source mapping for Standard Schema validation (GH-058).
 *
 * Each source extractor pulls plain decoded data from the request exactly
 * once and hands it to the schema: forms and JSON consume the body through
 * the bounded parsers (their single-consumption guard is what makes double
 * body reads impossible — a schema can only ever see already-decoded data);
 * query, params, and headers are lazy per-request reads. Coercion is the
 * schema's responsibility; Bundar never mutates input or output.
 */
import type { Context } from "@bundar/core";
import { parseForm, parseJson, type ParsedForm } from "@bundar/core";
import { validateSchema } from "./validate";
import type { StandardSchema } from "./standard";
import type { ValidationResult } from "./validate";

function formInput(form: ParsedForm): Record<string, string | string[]> {
  const input: Record<string, string | string[]> = {};
  for (const field of form.fields) {
    if (field.name in input) continue; // first appearance already recorded
    const values = form.getAll(field.name);
    input[field.name] = values.length > 1 ? [...values] : values[0]!;
  }
  return input;
}

/**
 * Validates submitted form data against a schema. The body is read once by
 * the bounded parser; a second call fails with `BodyConsumedError` from the
 * parser (deterministic, never a silent second read), and the schema itself
 * only ever receives the decoded record.
 */
export async function validateForm<Output>(
  context: Context,
  schema: StandardSchema<unknown, Output>,
): Promise<ValidationResult<Output>> {
  return validateSchema(schema, formInput(await parseForm(context)));
}

/**
 * Validates a JSON request body against a schema via the bounded parser
 * (same single-consumption guarantees as `validateForm`).
 */
export async function validateJson<Output>(
  context: Context,
  schema: StandardSchema<unknown, Output>,
): Promise<ValidationResult<Output>> {
  return validateSchema(schema, await parseJson(context));
}

/**
 * Validates query parameters: single-valued keys map to strings; repeated
 * keys map to string arrays in submission order (the schema decides how to
 * treat them).
 */
export function validateQuery<Output>(
  context: Context,
  schema: StandardSchema<unknown, Output>,
): ValidationResult<Output> | Promise<ValidationResult<Output>> {
  const search = new URL(context.request.url).searchParams;
  const input: Record<string, string | string[]> = {};
  for (const key of search.keys()) {
    if (key in input) continue;
    const values = search.getAll(key);
    input[key] = values.length > 1 ? [...values] : values[0]!;
  }
  return validateSchema(schema, input);
}

/** Validates path parameters (already decoded by the router). */
export function validateParams<Output>(
  context: Context,
  schema: StandardSchema<unknown, Output>,
): ValidationResult<Output> | Promise<ValidationResult<Output>> {
  return validateSchema(
    schema,
    Object.freeze({ ...context.params }) as Record<string, string>,
  );
}

/** Validates request headers (keys lowercased by the Headers API). */
export function validateHeaders<Output>(
  context: Context,
  schema: StandardSchema<unknown, Output>,
): ValidationResult<Output> | Promise<ValidationResult<Output>> {
  const input: Record<string, string> = {};
  for (const [key, value] of context.request.headers.entries()) {
    input[key] = value;
  }
  return validateSchema(schema, input);
}
