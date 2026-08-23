/**
 * @bundar/forms public surface (BR-013 skeleton).
 *
 * Ownership per ADR-0018 §3: this package owns the progressive-form
 * workflow — bounded parsing orchestration, retained values, field-error
 * presentation models, and ordinary/enhanced action composition. The raw
 * parser primitives stay in `@bundar/core`; HTMX response composition stays
 * in `@bundar/htmx` behind an injected composer; Standard Schema validation
 * is integrated through `@bundar/schema`. No validator ships or is required.
 *
 * This skeleton freezes the CONTRACT names before BR-014/BR-015 move any
 * implementation; the placeholder factories below throw so accidental early
 * usage fails loudly instead of silently forking behavior.
 */
import type { ParsedForm } from "@bundar/core";
import type { FieldErrorModel } from "@bundar/schema";

/** Contract version of this surface; bumps when a contract shape changes. */
export const FORMS_CONTRACT_VERSION = "1.0.0-skeleton";

/**
 * The validated, bounded outcome of parsing + validating one form
 * submission: typed data on success, field errors plus safe retained values
 * on failure. Implementation lands with BR-014.
 */
export interface FormSubmission<TData> {
  readonly ok: boolean;
  readonly data: TData | null;
  readonly fieldErrors: Readonly<FieldErrorModel>;
  readonly retained: Readonly<Record<string, string>>;
}

/**
 * The parsed-and-bounded form body this package orchestrates validation
 * over; re-exported as a contract alias so downstream tasks bind to
 * `@bundar/forms` rather than reaching into kernel internals.
 */
export type FormsParsedBody = ParsedForm;

/**
 * Composes one business action into an ordinary (Post/Redirect/Get) and an
 * enhanced (fragment + response directives) response from the same
 * mutation. The enhanced-response side is injected by the application via
 * `composeEnhanced`, so this package never imports `@bundar/htmx`
 * (ADR-0018 §2). Implementation lands with BR-015.
 */
export interface FormActionComposer {
  composeEnhanced: (submissionResult: Response) => Response;
}

/**
 * Composes one business action into an ordinary (Post/Redirect/Get) and an
 * enhanced (fragment + response directives) response from the same
 * mutation. The enhanced-response side is injected by the application via
 * `composeEnhanced`, so this package never imports `@bundar/htmx`
 * (ADR-0018 §2). Implementation lands with BR-015.
 */
export interface FormActionComposer {
  composeEnhanced: (submissionResult: Response) => Response;
}

/**
 * Declares ownership intent for tooling and docs; returns the frozen
 * responsibility statement enforced by the architecture checker.
 */
export function formsContractSummary(): string {
  return [
    "owner: progressive-form workflow (parsing orchestration, retained values,",
    "field-error models, action composition)",
    "depends on: @bundar/core (parser primitives), @bundar/schema (validation)",
    "never imports: @bundar/htmx, @bundar/security, @bundar/testing, @bundar/cli",
    "ships no validator; Standard Schema integration is adapter-based",
  ].join("\n");
}

/**
 * Placeholder factory — intentionally unimplemented until BR-014 freezes
 * the extracted contracts from `@bundar/htmx`'s current form-action module.
 */
export function defineFormAction(): never {
  throw new Error(
    "@bundar/forms: defineFormAction is a BR-013 skeleton contract; " +
      "implementation arrives with BR-014/BR-015 (see ADR-0018 section 3)",
  );
}
