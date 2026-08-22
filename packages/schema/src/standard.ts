/**
 * Standard Schema v1 types (spec-copied, unmodified).
 *
 * Source: https://standardschema.dev — the vendor-neutral schema interface
 * implemented by Zod, Valibot, ArkType and others. Bundar consumes any
 * conforming schema; it does not choose, wrap, or require a specific
 * validator, and it never ships one as a runtime dependency.
 */

/** A single path segment of an issue's location. */
export type StandardSchemaPathSegment = { readonly key: PropertyKey };

/** Where an issue occurred; segments may be plain keys or `{ key }` records. */
export type StandardSchemaPath = ReadonlyArray<
  PropertyKey | StandardSchemaPathSegment
>;

export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: StandardSchemaPath;
}

export type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | {
      readonly issues: ReadonlyArray<StandardSchemaIssue>;
      readonly value?: undefined;
    };

export interface StandardSchemaProps<Input = unknown, Output = Input> {
  /** The version number of the standard. */
  readonly version: 1;
  /** The vendor name of the schema library. */
  readonly vendor: string;
  readonly validate: (
    value: unknown,
  ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
  /** Optional types shortcut used by libraries for inference. */
  readonly types?:
    | undefined
    | {
        readonly input: Input;
        readonly output: Output;
      };
}

/** Any schema conforming to the Standard Schema specification. */
export interface StandardSchema<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaProps<Input, Output>;
}
