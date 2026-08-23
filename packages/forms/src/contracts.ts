/**
 * Framework-neutral form-action contracts (BR-014).
 *
 * The frozen boundary between form WORKFLOW (owned here, ADR-0018 §3) and
 * response DELIVERY (owned by the caller's adapter — typically the htmx
 * dialect layer). Deliberately free of dialect adapters and raw HTMX header
 * names: enhanced/ordinary intent is separated at the representation level
 * (`delivery` is an opaque adapter-owned record), so this module stays
 * wire-ignorant. Validation integrates only through @bundar/schema types;
 * no validator is required.
 */
import type { Context } from "@bundar/core";
import type { FieldErrorModel } from "@bundar/schema";
import type { StandardSchema } from "@bundar/schema";
import type { FormValidationAdapter } from "./validation";

/**
 * The workflow's request-context requirement. Re-exported as a neutral
 * name so presentation layers (e.g. htmx) can type their public facades
 * without importing the kernel directly (ADR-0018 §2).
 */
export type FormWorkflowContext = Context;

/** 422 for invalid submissions in BOTH worlds (documented semantics). */
export const INVALID_SUBMISSION_STATUS = 422 as const;

/** Transaction hooks bracketing the valid path; success runs exactly once. */
export interface FormTransaction {
  /** Return a token/rollback handle; failures abort the action. */
  readonly begin: () => Promise<unknown> | unknown;
  readonly commit: (handle: unknown) => Promise<void> | void;
  readonly rollback: (handle: unknown) => Promise<void> | void;
}

/** Safe retained submitted values handed to renderers. */
export type RetainedValues = Readonly<Record<string, string | string[]>>;

/** Everything an invalid-form renderer needs — never the raw submission. */
export interface InvalidFormRender {
  /** Field-error model (multi-error, ordered, global-separated). */
  readonly errors: FieldErrorModel;
  /** Retained safe submitted values (secrets redacted by policy). */
  readonly submitted: RetainedValues;
  /** Focus hint: the first field with an error. */
  readonly firstErrorField: string | null;
}

/**
 * What the workflow hands the response adapter when validation SUCCEEDS.
 * The fragment is already resolved (async builders awaited); `delivery`
 * carries adapter-owned presentation options verbatim so this contract
 * never grows wire concepts.
 */
export interface ValidSubmissionDelivery {
  /** Resolved fragment content (JSX tree or prebuilt string). */
  readonly fragment: unknown;
  /** Adapter-specific delivery options (redirects, directives, status…). */
  readonly delivery: Readonly<Record<string, unknown>>;
}

/** What the workflow hands the adapter when validation FAILS. */
export interface InvalidSubmissionDelivery {
  readonly status: typeof INVALID_SUBMISSION_STATUS;
  readonly message: string;
  /** Ready-made renderer data: errors, retained values, focus hint. */
  readonly render: InvalidFormRender;
  /** Server-known region selector for enhanced error delivery. */
  readonly formTarget?: string;
}

/**
 * The neutral, framework-owned definition of one validated form action.
 * `success.delivery` is opaque to this package; the htmx layer keeps its
 * public definition shape by extending these contracts with its own
 * delivery fields (structural typing preserves existing inference).
 */
export interface FormActionDefinition<Output> {
  /** The Standard Schema the submission is validated against. */
  readonly schema: StandardSchema<unknown, Output>;
  /**
   * Optional custom validation port. When present it REPLACES the default
   * Standard Schema path — custom validators need not import
   * `@bundar/schema` at all.
   */
  readonly validation?: FormValidationAdapter<Output>;
  /** Builds the success fragment from the validated output. */
  readonly buildFragment: (output: Output) => Promise<unknown> | unknown;
  /** Adapter-owned delivery options for the valid path. */
  readonly delivery?: Readonly<Record<string, unknown>>;
  /** Re-renders the form region with errors + retained safe values. */
  readonly renderForm: (render: InvalidFormRender) => unknown;
  /** Server-known region selector for enhanced error delivery. */
  readonly formTarget?: string;
  /** Optional transaction hooks around the valid path. */
  readonly transaction?: FormTransaction;
}

/** The composed result of running a form action. */
export type FormActionOutcome =
  | { readonly kind: "invalid"; readonly response: Response }
  | { readonly kind: "valid"; readonly response: Response };

/**
 * Response-delivery port (implemented per presentation layer, e.g. htmx).
 * The workflow calls exactly one of these per submission and never touches
 * headers or protocol names itself.
 */
export interface FormResponseAdapter {
  invalid(
    request: Request,
    invalid: InvalidSubmissionDelivery,
  ): Response | Promise<Response>;
  valid(
    request: Request,
    valid: ValidSubmissionDelivery,
  ): Response | Promise<Response>;
}
