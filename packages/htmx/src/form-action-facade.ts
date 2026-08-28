/**
 * Additive htmx form-action facade over the separated workflow (GH-183).
 *
 * Maps {@link HtmxFormActionDefinition} — Input/Result separated, with an
 * explicit `success`/`invalid` presentation split — onto the neutral
 * `ExecutableFormActionDefinition` executor landed by GH-181, and delivers
 * responses through the SAME composition this package has always owned:
 * `actionResponse()` for PRG vs enhanced-fragment composition, status
 * validation, directives, cache policy and Vary; `errorViewResponse()` for
 * ordinary-document vs enhanced-error negotiation and retarget/reswap. No
 * raw HX-* header logic lives here. The legacy `runFormAction` path is
 * untouched (GH-184 proves equivalence).
 */
import {
  executeExecutableFormAction,
  invalidField,
  type ExecutableFormActionDefinition,
  type FormActionOutcome,
  type FormResponseAdapter,
  type FormTransaction,
  type FormWorkflowContext,
  type InvalidFieldView,
  type InvalidFormRender,
} from "@bundar/forms";
import {
  action,
  actionResponse,
  type ActionBodyStatus,
  type ActionRedirectStatus,
} from "./action";
import type { HtmxDialectAdapter, HtmxResponseDirective } from "./dialect";
import { genericErrorDocument } from "./error-document";
import {
  errorViewResponse,
  type ErrorPresentationPolicy,
  type ErrorViewOptions,
  type PublicErrorView,
} from "./error-view";

/**
 * The invalid-form render data plus a field accessor built on GH-182's
 * `invalidField`: duplicate submissions stay observable, globals never
 * leak into fields, and redaction stays owned upstream. Additive — the
 * original `InvalidFormRender` is never mutated.
 */
export interface InvalidFormView extends InvalidFormRender {
  readonly field: (name: string) => InvalidFieldView;
}

/** Wraps a render WITHOUT mutating it (structural extension only). */
function withFieldHelper(render: InvalidFormRender): InvalidFormView {
  return {
    ...render,
    field: (name) => invalidField(render, name),
  };
}

/**
 * This package's separated form-action definition. The workflow shape is
 * the neutral GH-180 contract (schema → run → result → fragment); htmx
 * delivery options live under `success` (ActionOptions fields minus the
 * fragment builder) and `invalid` (region fragment, optional application
 * document, server-known target).
 */
export interface HtmxFormActionDefinition<Input, Result> {
  /** The Standard Schema the submission is validated against. */
  readonly schema: ExecutableFormActionDefinition<Input, Result>["schema"];
  /** Optional custom validation port, mirroring the neutral contract. */
  readonly validation?: ExecutableFormActionDefinition<
    Input,
    Result
  >["validation"];
  /** Runs the business action exactly once on the validated input. */
  readonly run: (
    input: Input,
    context: FormWorkflowContext,
  ) => Result | Promise<Result>;
  /** Success presentation, built from the DOMAIN RESULT. */
  readonly success: {
    readonly fragment: (
      result: Result,
      context: FormWorkflowContext,
    ) => unknown | Promise<unknown>;
    /** Post/Redirect/Get fallback target for ordinary submissions. */
    readonly redirectTo?: string;
    readonly redirectStatus?: ActionRedirectStatus;
    /** Opt-out for enhanced-only endpoints (see `action()`). */
    readonly noFallbackRedirect?: boolean;
    /** Body status for the enhanced response. */
    readonly status?: ActionBodyStatus;
    readonly directives?: readonly HtmxResponseDirective[];
    readonly privateContent?: boolean;
  };
  /** Invalid-submission presentation. */
  readonly invalid: {
    /** Re-renders the form region with field-aware error data. */
    readonly fragment: (
      render: InvalidFormView,
      context: FormWorkflowContext,
    ) => unknown;
    /**
     * BR-088: re-renders the APPLICATION DOCUMENT for ordinary (no-JS)
     * invalid submissions. When omitted, the generic error document is
     * used (role=alert summary WITHOUT field anchor links).
     */
    readonly document?: (
      render: InvalidFormView,
      view: PublicErrorView,
      context: FormWorkflowContext,
    ) => unknown;
    /** Server-known region selector for enhanced error delivery. */
    readonly target?: string;
  };
  /** Optional transaction hooks around the valid path. */
  readonly transaction?: FormTransaction;
}

/**
 * Zero-runtime identity helper: its whole job is INFERENCE. Input flows
 * from the schema, Result flows from `run()` straight into
 * `success.fragment()` — no freezing, normalizing, or cloning.
 */
export function defineFormAction<Input, Result>(
  definition: HtmxFormActionDefinition<Input, Result>,
): HtmxFormActionDefinition<Input, Result> {
  return definition;
}

/** The dialect-bound facade: common (`handle`) and advanced (`execute`) paths. */
export interface FormActionsFacade {
  /** Full workflow outcome — discriminated invalid/valid with the Response. */
  execute<Input, Result>(
    context: FormWorkflowContext,
    definition: HtmxFormActionDefinition<Input, Result>,
  ): Promise<FormActionOutcome>;
  /** Direct route handler — resolves to the composed Response. */
  handle<Input, Result>(
    definition: HtmxFormActionDefinition<Input, Result>,
  ): (context: FormWorkflowContext) => Promise<Response>;
}

/** Strips the fragment builder, leaving the ActionOptions delivery fields. */
function withoutFragment(
  success: HtmxFormActionDefinition<never, never>["success"],
): Record<string, unknown> {
  const { fragment: _fragment, ...delivery } = success;
  void _fragment;
  return delivery as Record<string, unknown>;
}

/** Maps the facade definition onto the neutral GH-180 contract. */
function toNeutralDefinition<Input, Result>(
  definition: HtmxFormActionDefinition<Input, Result>,
): ExecutableFormActionDefinition<Input, Result> {
  return {
    schema: definition.schema,
    validation: definition.validation,
    run: definition.run,
    buildFragment: definition.success.fragment,
    delivery: withoutFragment(definition.success),
    renderForm: (render, context) =>
      definition.invalid.fragment(withFieldHelper(render), context),
    formTarget: definition.invalid.target,
    transaction: definition.transaction,
  };
}

/**
 * The htmx delivery adapter for the facade: identical negotiation to the
 * legacy adapter — `errorViewResponse()` owns document/fragment delivery
 * and retarget/reswap; `actionResponse()` owns PRG vs enhanced composition.
 * The request's context is captured per execution so the app's document
 * renderer receives the SAME workflow context object as run/fragment.
 */
function facadeAdapter<Input, Result>(
  context: FormWorkflowContext,
  definition: HtmxFormActionDefinition<Input, Result>,
  options: ErrorViewOptions,
): FormResponseAdapter {
  return {
    invalid(request, delivery) {
      const policy: ErrorPresentationPolicy = {
        renderDocument: genericErrorDocument,
        renderFragment: () =>
          definition.invalid.fragment(
            withFieldHelper(delivery.render),
            context,
          ),
        fragmentTarget: delivery.formTarget ?? definition.invalid.target,
        ...(definition.invalid.document
          ? {
              renderDocument: (view: PublicErrorView) =>
                definition.invalid.document!(
                  withFieldHelper(delivery.render),
                  view,
                  context,
                ),
            }
          : {}),
      };
      const view: PublicErrorView = {
        status: delivery.status,
        code: "unprocessable",
        message: delivery.message,
        fieldErrors: delivery.render.errors,
      };
      return errorViewResponse(request, view, policy, options);
    },
    valid(request, { fragment }) {
      void request;
      return actionResponse(
        request,
        action({ ...withoutFragment(definition.success), fragment }),
        options,
      );
    },
  };
}

/**
 * Binds the dialect once and exposes both paths over the separated
 * workflow: `execute()` preserves the discriminated outcome;
 * `handle()` resolves straight to the composed Response. The execute
 * implementation is captured in a local (not a `this` method) so
 * destructuring the facade can never break it.
 */
export function createFormActions(options: {
  readonly dialect: HtmxDialectAdapter;
}): FormActionsFacade {
  const viewOptions: ErrorViewOptions = { dialect: options.dialect };
  const execute = async <Input, Result>(
    context: FormWorkflowContext,
    definition: HtmxFormActionDefinition<Input, Result>,
  ): Promise<FormActionOutcome> =>
    executeExecutableFormAction(
      context,
      toNeutralDefinition(definition),
      facadeAdapter(context, definition, viewOptions),
    );
  return {
    execute,
    handle: (definition) => async (context) =>
      (await execute(context, definition)).response,
  };
}
