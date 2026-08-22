/**
 * Validation results as field-error rendering data (GH-059).
 *
 * Converts a failed ValidationResult into stable, HTML-renderable data:
 * per-field message lists (multiple errors preserved in issue order),
 * form-level globals kept distinct, deterministic ordering, nested paths
 * mapped deliberately to addressable field ids, and submitted values
 * retained only when safe — sensitive keys are redacted by policy and
 * uploaded content is never retained. No JSON round trip required.
 */
import type { ValidationIssue, ValidationResult } from "./validate";

/** Keys whose values are never retained in rendered models or logs. */
export const SENSITIVE_FIELD_KEYS: readonly string[] = Object.freeze([
  "password",
  "pass",
  "passwd",
  "passphrase",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "authorization",
  "cookie",
  "session",
  "credit_card",
  "card_number",
  "cvv",
  "cvc",
  "ssn",
  "pin",
]);

export interface FieldErrorRedactionOptions {
  /**
   * Additional key patterns treated as sensitive (matched
   * case-insensitively against every path segment). Default policy
   * (SENSITIVE_FIELD_KEYS) always applies on top.
   */
  readonly redactKeys?: readonly string[];
}

export interface FieldError {
  /** Addressable field id: dot-joined path, e.g. `items.0.name`. */
  readonly field: string;
  readonly message: string;
}

export interface FieldErrorModel {
  /** Field id → ordered messages; multiple errors per field preserved. */
  readonly fields: Readonly<Record<string, readonly string[]>>;
  /** Form-level errors (issues with an empty path), in issue order. */
  readonly global: readonly string[];
  /** Field ids in first-appearance order (deterministic). */
  readonly order: readonly string[];
  /** Retained safe submitted values; sensitive keys and files never appear. */
  readonly submitted: Readonly<Record<string, string | string[]>>;
  /** Messages for one field; empty array when the field has no errors. */
  field(name: string): readonly string[];
  has(name: string): boolean;
  /** First error per field, in order — the input for summary links. */
  readonly first: readonly FieldError[];
  /** True when there is nothing to render. */
  readonly empty: boolean;
}

function fieldId(path: readonly PropertyKey[]): string {
  return path.map((segment) => String(segment)).join(".");
}

function isSensitive(
  path: readonly PropertyKey[],
  extra: readonly string[],
): boolean {
  const patterns = [
    ...SENSITIVE_FIELD_KEYS.map((key) => key.toLowerCase()),
    ...extra.map((key) => key.toLowerCase()),
  ];
  return path.some((segment) => {
    const key = String(segment).toLowerCase();
    return patterns.includes(key) || patterns.some((p) => key.includes(p));
  });
}

function retainValue(value: unknown): string | string[] | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string"))
    return [...value];
  // numbers/booleans are safe primitives; files and objects (including
  // uploaded content) are never retained.
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return undefined;
}

/**
 * Builds the renderable error model from a failed validation result.
 * `submitted` is the exact input the schema rejected (e.g. the form record
 * from validateForm's source) — sensitive keys are dropped by policy and
 * non-primitive values (files, objects) are never retained.
 */
export function toFieldErrors(
  result: ValidationResult<never>,
  options: {
    readonly submitted?: Record<string, unknown>;
  } & FieldErrorRedactionOptions = {},
): FieldErrorModel {
  if (result.success) {
    throw new TypeError(
      "toFieldErrors(): result is successful — there are no issues to render",
    );
  }

  const fields = new Map<string, string[]>();
  const global: string[] = [];

  for (const issue of result.issues as readonly ValidationIssue[]) {
    if (issue.path.length === 0) {
      global.push(issue.message);
      continue;
    }
    const id = fieldId(issue.path);
    const list = fields.get(id);
    if (list === undefined) fields.set(id, [issue.message]);
    else list.push(issue.message);
  }

  const order: string[] = [...fields.keys()];
  const fieldsRecord: Record<string, readonly string[]> = {};
  for (const id of order) fieldsRecord[id] = Object.freeze(fields.get(id)!);

  const submitted: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(options.submitted ?? {})) {
    if (isSensitive([key], options.redactKeys ?? [])) continue;
    const retained = retainValue(value);
    if (retained !== undefined) submitted[key] = retained;
  }

  const first: FieldError[] = order.map((id) => ({
    field: id,
    message: fieldsRecord[id]![0]!,
  }));

  return Object.freeze({
    fields: Object.freeze(fieldsRecord),
    global: Object.freeze(global),
    order: Object.freeze(order),
    submitted: Object.freeze(submitted),
    field: (name: string): readonly string[] => fieldsRecord[name] ?? [],
    has: (name: string): boolean => fieldsRecord[name] !== undefined,
    first: Object.freeze(first),
    get empty(): boolean {
      return order.length === 0 && global.length === 0;
    },
  }) as FieldErrorModel;
}

/**
 * Redacts a submitted record standalone (no validation result required):
 * sensitive keys and non-primitive values are dropped under the same policy
 * `toFieldErrors` applies. Safe for logs and re-rendered forms.
 */
export function redactSubmitted(
  submitted: Record<string, unknown>,
  options: FieldErrorRedactionOptions = {},
): Record<string, string | string[]> {
  const safe: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(submitted)) {
    if (isSensitive([key], options.redactKeys ?? [])) continue;
    const retained = retainValue(value);
    if (retained !== undefined) safe[key] = retained;
  }
  return safe;
}
