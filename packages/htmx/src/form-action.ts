/**
 * Progressive validated form actions (GH-060).
 *
 * Composes the full pipeline behind ONE handler API: bounded form parsing
 * (GH-057), Standard Schema validation (GH-058), field-error rendering
 * data with safe value retention (GH-059), the action response composer
 * (GH-050), and error-view negotiation (GH-065). Identical business
 * validation runs for normal browsers and enhanced flows — no JSON client
 * code, no per-path logic. Transaction hooks bracket the valid path so the
 * app owns database behavior while the composer guarantees
 * exactly-once execution of the provided success handler.
 */
import type { Context } from "@bundar/core";
import { parseForm } from "@bundar/core";
import {
  toFieldErrors,
  validateSchema,
  type ValidationResult,
} from "@bundar/schema";
import type { FieldErrorModel } from "@bundar/schema";
import type { StandardSchema } from "@bundar/schema";
import { ErrorSummary } from "@bundar/jsx";
import { jsx } from "@bundar/jsx";
import { actionResponse, action, type ActionOptions } from "./action";
import {
  errorViewResponse,
  type ErrorPresentationPolicy,
  type ErrorViewOptions,
  type PublicErrorView,
} from "./error-view";

export interface FormActionDefinition<Output> {
  /** The Standard Schema the submission is validated against. */
  readonly schema: StandardSchema<unknown, Output>;
  /** Options for the success action (fragment, redirect, directives…). */
  readonly action: Omit<ActionOptions, "fragment"> & {
    /** Built from the validated output. */
    readonly fragment: (output: Output) => unknown;
  };
  /** Re-renders the form region with errors + retained safe values. */
  readonly renderForm: (render: InvalidFormRender) => unknown;
  /** Server-known region selector for enhanced error delivery. */
  readonly formTarget?: string;
  /** Optional transaction hooks around the valid path. */
  readonly transaction?: {
    /** Return a token/rollback handle; failures abort the action. */
    begin: () => Promise<unknown> | unknown;
    commit: (handle: unknown) => Promise<void> | void;
    rollback: (handle: unknown) => Promise<void> | void;
  };
}

/** Everything an invalid-form renderer needs — never the raw error. */
export interface InvalidFormRender {
  /** GH-059 field-error model (multi-error, ordered, global-separated). */
  readonly errors: FieldErrorModel;
  /** Retained safe submitted values (secrets redacted by policy). */
  readonly submitted: Readonly<Record<string, string | string[]>>;
  /** Focus hint: the first field with an error. */
  readonly firstErrorField: string | null;
}

/** The composed result of running a form action. */
export type FormActionOutcome =
  | { readonly kind: "invalid"; readonly response: Response }
  | { readonly kind: "valid"; readonly response: Response };

/** 422 for invalid submissions in BOTH worlds (documented semantics). */
export const INVALID_SUBMISSION_STATUS = 422 as const;

function defaultErrorPolicy(
  definition: FormActionDefinition<unknown>,
): ErrorPresentationPolicy {
  return {
    renderDocument: (view: PublicErrorView) =>
      jsx("html", {
        lang: "en",
        children: [
          jsx("head", {
            children: jsx("title", { children: `Error ${view.status}` }),
          }),
          jsx("body", {
            children: [
              jsx("h1", { children: view.message }),
              view.fieldErrors
                ? ErrorSummary({ errors: view.fieldErrors })
                : null,
            ],
          }),
        ],
      }),
    // the form renderer receives the REDACTED retained values from the
    // GH-059 model (model.submitted), never the raw submission
    renderFragment: (view) => {
      const model = view.fieldErrors as FieldErrorModel | undefined;
      const raw = (
        view as PublicErrorView & { rawSubmitted?: Record<string, unknown> }
      ).rawSubmitted;
      const retained: Record<string, string | string[]> = {};
      if (model !== undefined && raw !== undefined) {
        for (const key of Object.keys(model.submitted)) {
          const value = model.submitted[key];
          if (value !== undefined) retained[key] = value;
        }
      }
      return definition.renderForm({
        errors: (model ?? {
          fields: {},
          global: [],
          order: [],
          submitted: {},
          field: () => [],
          has: () => false,
          first: [],
          empty: true,
        }) as FieldErrorModel,
        submitted: retained,
        firstErrorField: model?.first[0]?.field ?? null,
      });
    },
    fragmentTarget: definition.formTarget,
  };
}

/**
 * Runs the validated form action for one request: parse → validate →
 * (invalid) render the form region/document with GH-059 data, or (valid)
 * run the success handler exactly once inside the transaction hooks and
 * compose the GH-050 action response.
 */
export async function runFormAction<Output>(
  context: Context,
  definition: FormActionDefinition<Output>,
  options: ErrorViewOptions = {},
): Promise<FormActionOutcome> {
  // 1. bounded parse (single consumption; the schema sees decoded data)
  const form = await parseForm(context);
  const submitted: Record<string, string | string[]> = {};
  for (const field of form.fields) {
    if (field.name in submitted) continue;
    const values = form.getAll(field.name);
    submitted[field.name] = values.length > 1 ? [...values] : values[0]!;
  }

  // 2. identical business validation for both worlds
  const result: ValidationResult<Output> = await validateSchema(
    definition.schema,
    submitted,
  );

  // 3. invalid: render the form region (or document) with safe data
  if (!result.success) {
    const model = toFieldErrors(result, { submitted });
    const view: PublicErrorView & {
      rawSubmitted: Record<string, unknown>;
    } = {
      status: INVALID_SUBMISSION_STATUS,
      code: "unprocessable",
      message: "Validation failed",
      fieldErrors: model,
      rawSubmitted: submitted,
    };
    const response = await errorViewResponse(
      context.request,
      view,
      defaultErrorPolicy(definition as FormActionDefinition<unknown>),
      options,
    );
    return { kind: "invalid", response };
  }

  // 4. valid: exactly-once success handler inside the transaction hooks
  let handle: unknown;
  if (definition.transaction !== undefined) {
    handle = await definition.transaction.begin();
  }
  let fragment: unknown;
  try {
    fragment = definition.action.fragment(result.value);
    // resolve promises from the fragment builder BEFORE commit so a
    // business failure rolls the transaction back instead of committing
    // half-rendered state
    if (
      typeof fragment === "object" &&
      fragment !== null &&
      typeof (fragment as { then?: unknown }).then === "function"
    ) {
      fragment = await fragment;
    }
  } catch (error) {
    if (definition.transaction !== undefined) {
      await definition.transaction.rollback(handle);
    }
    throw error;
  }
  if (definition.transaction !== undefined) {
    await definition.transaction.commit(handle);
  }

  const { fragment: _fragmentBuilder, ...actionOptions } = definition.action;
  void _fragmentBuilder;
  const response = await actionResponse(
    context.request,
    action({
      ...actionOptions,
      fragment,
    }),
    options,
  );
  return { kind: "valid", response };
}
