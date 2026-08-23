/**
 * Validation port for form actions (BR-016).
 *
 * The workflow consumes ONE minimal structural port. The default
 * implementation wraps any Standard Schema through `@bundar/schema`; a
 * custom validator satisfies the same interface WITHOUT importing
 * `@bundar/schema` at all — the outcome and renderer-data shapes are plain
 * structural types. Sensitive rejected values stay un-retained by default:
 * retention policy lives in the field-error model (GH-059 redaction), not
 * in this port.
 */
import {
  toFieldErrors,
  validateSchema,
  type FieldErrorModel,
  type StandardSchema,
  type ValidationResult,
} from "@bundar/schema";
import type { InvalidFormRender } from "./contracts";

/** Structural outcome every validator port must produce. */
export type FormValidationOutcome<Output> =
  | { readonly success: true; readonly value: Output }
  | {
      readonly success: false;
      readonly issues: ReadonlyArray<{
        readonly path: ReadonlyArray<PropertyKey>;
        readonly message: string;
      }>;
    };

/**
 * Minimal validation port consumed by {@link executeFormAction}. Implement
 * it directly for custom validators; use `standardSchemaAdapter` for any
 * Standard Schema validator.
 */
export interface FormValidationAdapter<Output> {
  validate(
    input: Record<string, unknown>,
  ): FormValidationOutcome<Output> | Promise<FormValidationOutcome<Output>>;
  /** Builds the safe renderer data for an invalid outcome. */
  invalidRender(
    result: Extract<FormValidationOutcome<Output>, { success: false }>,
    submitted: Readonly<Record<string, string | string[]>>,
  ): InvalidFormRender;
}

/** Any Standard Schema v1 validator (structurally checked). */
export type AnyStandardSchema<Output> = StandardSchema<unknown, Output>;

export function isStandardSchemaLike(
  value: unknown,
): value is AnyStandardSchema<never> {
  if (typeof value !== "object" || value === null) return false;
  const props = (value as { "~standard"?: unknown })["~standard"];
  if (typeof props !== "object" || props === null) return false;
  const candidate = props as { version?: unknown; validate?: unknown };
  return candidate.version === 1 && typeof candidate.validate === "function";
}

/** Wraps a Standard Schema validator into the workflow port. */
export function standardSchemaAdapter<Output>(
  schema: AnyStandardSchema<Output>,
): FormValidationAdapter<Output> {
  return {
    async validate(input) {
      const result = await validateSchema(schema, input);
      return result as FormValidationOutcome<Output>;
    },
    invalidRender(result, submitted) {
      const model: FieldErrorModel = toFieldErrors(
        result as ValidationResult<never>,
        { submitted: { ...submitted } },
      );
      return {
        errors: model,
        submitted: model.submitted,
        firstErrorField: model.first[0]?.field ?? null,
      };
    },
  };
}

/** Resolves the effective port from a definition's schema/validation pair. */
export function resolveValidationAdapter<Output>(
  schema: AnyStandardSchema<Output> | undefined,
  validation: FormValidationAdapter<Output> | undefined,
): FormValidationAdapter<Output> {
  if (validation !== undefined) return validation;
  if (schema !== undefined && isStandardSchemaLike(schema)) {
    return standardSchemaAdapter(schema);
  }
  throw new Error(
    "@bundar/forms: provide either a Standard Schema (`schema`) or a " +
      "custom `validation` adapter on the form action definition",
  );
}
