/**
 * Progressive validated form actions (GH-060, BR-015).
 *
 * The WORKFLOW lives in `@bundar/forms` (ADR-0018 §3): parsing, validation,
 * retention, transaction exactly-once semantics. This module is the htmx
 * DELIVERY adapter over that neutral runtime — it maps this package's
 * public definition shape (unchanged since GH-060: `action` options with
 * fragments/redirects/directives) onto the neutral contract and supplies
 * response composition through action/error-view negotiation.
 *
 * Public API is unchanged; behavior is identical to the pre-move module.
 */
import { jsx } from "@bundar/jsx";
import { ErrorSummary } from "@bundar/jsx";
import {
  executeFormAction,
  INVALID_SUBMISSION_STATUS,
  type FormActionDefinition as NeutralFormActionDefinition,
  type FormResponseAdapter,
} from "@bundar/forms";
import type {
  FormActionOutcome,
  FormWorkflowContext,
  InvalidFormRender,
} from "@bundar/forms";
import { actionResponse, action, type ActionOptions } from "./action";
import {
  errorViewResponse,
  type ErrorPresentationPolicy,
  type ErrorViewOptions,
  type PublicErrorView,
} from "./error-view";

export { INVALID_SUBMISSION_STATUS };
export type { FormActionOutcome, InvalidFormRender } from "@bundar/forms";

/**
 * This package's public form-action definition. Structurally it extends the
 * neutral `@bundar/forms` contract with htmx delivery options (`status`,
 * `directives`, `privateContent`, redirect fields) under the historical
 * `action` field — application code and inference are unchanged.
 */
export interface FormActionDefinition<Output> {
  /** The Standard Schema the submission is validated against. */
  readonly schema: NeutralFormActionDefinition<Output>["schema"];
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
  readonly transaction?: import("@bundar/forms").FormTransaction;
}

/** The empty field-error model used when classification yields none. */
function emptyErrorModel(): InvalidFormRender["errors"] {
  return {
    fields: {},
    global: [],
    order: [],
    submitted: {},
    field: () => [],
    has: () => false,
    first: [],
    empty: true,
  } as InvalidFormRender["errors"];
}

/**
 * The htmx delivery adapter: invalid submissions negotiate document vs
 * fragment error views exactly as before (GH-065); valid submissions
 * compose the GH-050 action response from the resolved fragment plus the
 * application's original action options.
 */
function htmxAdapter<Output>(
  definition: FormActionDefinition<Output>,
  options: ErrorViewOptions,
): FormResponseAdapter {
  return {
    invalid(request, delivery) {
      const policy: ErrorPresentationPolicy = {
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
        // the form renderer receives the REDACTED retained values computed
        // by the workflow (GH-059 model), never the raw submission
        renderFragment: () => definition.renderForm(delivery.render),
        fragmentTarget: delivery.formTarget ?? definition.formTarget,
      };
      const view: PublicErrorView = {
        status: delivery.status,
        code: "unprocessable",
        message: delivery.message,
        fieldErrors: delivery.render.errors ?? emptyErrorModel(),
      };
      return errorViewResponse(request, view, policy, options);
    },
    valid(request, { fragment }) {
      void request;
      const { fragment: _fragmentBuilder, ...actionOptions } =
        definition.action;
      void _fragmentBuilder;
      return actionResponse(
        request,
        action({ ...actionOptions, fragment }),
        options,
      );
    },
  };
}

/**
 * Runs the validated form action for one request: parse → validate →
 * (invalid) render the form region/document with GH-059 data, or (valid)
 * run the success handler exactly once inside the transaction hooks and
 * compose the GH-050 action response. Workflow execution is delegated to
 * `@bundar/forms`; this boundary only delivers responses.
 */
export async function runFormAction<Output>(
  context: FormWorkflowContext,
  definition: FormActionDefinition<Output>,
  options: ErrorViewOptions = {},
): Promise<FormActionOutcome> {
  return executeFormAction(
    context,
    {
      schema: definition.schema,
      buildFragment: (output) => definition.action.fragment(output),
      // adapter-owned delivery: everything except the fragment builder
      delivery: (() => {
        const { fragment: _f, ...rest } = definition.action;
        void _f;
        return rest as Record<string, unknown>;
      })(),
      renderForm: definition.renderForm,
      formTarget: definition.formTarget,
      transaction: definition.transaction,
    },
    htmxAdapter(definition, options),
  );
}
