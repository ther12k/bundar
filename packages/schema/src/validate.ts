/**
 * Standard Schema validation adapter (GH-058).
 *
 * One function validates any conforming schema — synchronous or asynchronous
 * — and normalizes the result without flattening library specifics: issues
 * become deterministic Bundar shapes (message + PropertyKey[] path) while the
 * original library issue stays reachable on `raw` as the explicit escape
 * hatch. Malformed dialect behavior fails closed with SchemaDialectError
 * instead of guessing.
 */
import type {
  StandardSchema,
  StandardSchemaIssue,
  StandardSchemaPath,
} from "./standard";

/** Normalized issue: message + concrete path; original kept on `raw`. */
export interface ValidationIssue {
  readonly message: string;
  readonly path: readonly PropertyKey[];
  /** The library-specific original issue (escape hatch for details Bundar's
   * normalized shape does not model — never used for logic). */
  readonly raw?: StandardSchemaIssue;
}

export type ValidationResult<Output> =
  | { readonly success: true; readonly value: Output }
  | {
      readonly success: false;
      readonly issues: readonly ValidationIssue[];
    };

/** Thrown when a value does not actually implement Standard Schema v1. */
export class SchemaDialectError extends Error {
  public constructor(detail: string) {
    super(`standard schema dialect error: ${detail}`);
    this.name = "SchemaDialectError";
  }
}

function normalizePath(path: StandardSchemaPath | undefined): PropertyKey[] {
  if (path === undefined) return [];
  const segments: PropertyKey[] = [];
  for (const segment of path) {
    if (typeof segment === "object" && segment !== null && "key" in segment) {
      segments.push((segment as { key: PropertyKey }).key);
      continue;
    }
    segments.push(segment as PropertyKey);
  }
  return segments;
}

function isStandardSchema(value: unknown): value is StandardSchema {
  if (typeof value !== "object" || value === null) return false;
  const props = (value as { "~standard"?: unknown })["~standard"];
  if (typeof props !== "object" || props === null) return false;
  const candidate = props as {
    version?: unknown;
    vendor?: unknown;
    validate?: unknown;
  };
  return (
    candidate.version === 1 &&
    typeof candidate.vendor === "string" &&
    typeof candidate.validate === "function"
  );
}

function normalizeResult(
  result: unknown,
  vendor: string,
): ValidationResult<unknown> {
  if (typeof result !== "object" || result === null) {
    throw new SchemaDialectError(
      `${vendor}.validate returned a non-object result`,
    );
  }
  const candidate = result as {
    value?: unknown;
    issues?: unknown;
  };
  if (candidate.issues !== undefined) {
    if (!Array.isArray(candidate.issues)) {
      throw new SchemaDialectError(
        `${vendor}.validate returned a non-array "issues"`,
      );
    }
    const issues: ValidationIssue[] = candidate.issues.map((issue) => {
      if (typeof issue !== "object" || issue === null) {
        throw new SchemaDialectError(
          `${vendor}.validate returned a malformed issue entry`,
        );
      }
      const entry = issue as { message?: unknown; path?: unknown };
      if (typeof entry.message !== "string") {
        throw new SchemaDialectError(
          `${vendor}.validate returned an issue without a string message`,
        );
      }
      if (entry.path !== undefined && !Array.isArray(entry.path)) {
        throw new SchemaDialectError(
          `${vendor}.validate returned an issue with a non-array path`,
        );
      }
      return {
        message: entry.message,
        path: normalizePath(entry.path as StandardSchemaPath | undefined),
        raw: issue as StandardSchemaIssue,
      };
    });
    return { success: false, issues: Object.freeze(issues) };
  }
  return { success: true, value: candidate.value };
}

/**
 * Validates `value` against any Standard Schema v1 schema. Sync and async
 * validators are both accepted (the standard permits both); the await makes
 * no assumption about which one runs. Coercion is the schema's
 * responsibility: Bundar passes plain decoded data in and returns the
 * schema's typed output untouched.
 */
export async function validateSchema<Output>(
  schema: StandardSchema<unknown, Output>,
  value: unknown,
): Promise<ValidationResult<Output>> {
  if (!isStandardSchema(schema)) {
    throw new SchemaDialectError(
      'schema does not expose a valid "~standard" { version: 1, vendor, validate } object',
    );
  }
  // A validator that throws instead of returning issues propagates as-is —
  // Bundar does not guess a conversion for nonconforming calls.
  const rawResult = await schema["~standard"].validate(value);
  const normalized = normalizeResult(rawResult, schema["~standard"].vendor);
  return normalized as ValidationResult<Output>;
}
