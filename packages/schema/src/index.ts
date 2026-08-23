/**
 * @bundar/schema public surface (GH-058).
 *
 * Standard Schema v1 types plus the validation adapter and request-source
 * mappers. Any conforming validator works; Bundar ships none and requires
 * none — @bundar/core keeps zero runtime dependencies on this package.
 */
export type {
  StandardSchema,
  StandardSchemaIssue,
  StandardSchemaPath,
  StandardSchemaPathSegment,
  StandardSchemaProps,
  StandardSchemaResult,
} from "./standard";
export { SchemaDialectError, validateSchema } from "./validate";
export type { ValidationIssue, ValidationResult } from "./validate";
export { redactSubmitted, SENSITIVE_FIELD_KEYS, toFieldErrors } from "./issues";
export type {
  FieldError,
  FieldErrorModel,
  FieldErrorRedactionOptions,
} from "./issues";
