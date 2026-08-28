/**
 * Additive executor for the separated form workflow (GH-181).
 *
 * Runs an {@link ExecutableFormActionDefinition}: bounded form parse,
 * Standard Schema (or custom-port) validation, an invalid path identical to
 * the legacy executor's, and an exactly-once success path — `run` executes
 * the business action on the validated input inside the transaction hooks,
 * the fragment is resolved from the DOMAIN RESULT before commit so a
 * rendering failure rolls back, and `commit` runs only after the full
 * success path. Response DELIVERY stays fully delegated to the caller's
 * FormResponseAdapter (ADR-0018 §3); this module never touches protocol
 * headers, so the same runtime serves htmx and any future presentation
 * layer.
 *
 * The legacy `executeFormAction` is deliberately left byte-for-byte alone
 * until GH-184 proves behavioral equivalence, at the cost of duplicating its
 * small private cancellation helpers here; consolidation is a post-#184
 * cleanup, not a license to retune legacy behavior.
 */
import { parseForm, type Context } from "@bundar/core";
import type { ValidationResult } from "@bundar/schema";
import {
  INVALID_SUBMISSION_STATUS,
  type ExecutableFormActionDefinition,
  type FormActionOutcome,
  type FormResponseAdapter,
  type InvalidFormRender,
} from "./contracts";
import {
  resolveValidationAdapter,
  type FormValidationAdapter,
} from "./validation";

/**
 * BR-058 honesty rule: Promise.race stops OUR continuation promptly but
 * cannot interrupt a native body parser that ignores signals. The losing
 * settlement is consumed defensively so no unhandled rejection escapes;
 * the residual limitation is documented rather than hidden.
 */
function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new Error("request cancellation (BR-058)");
}

async function raceAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw abortError(signal);
  const gate = new Promise<never>((_, reject) => {
    const onAbort = (): void => reject(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  // Defensive consumption of the loser prevents unhandled rejections.
  promise.catch(() => undefined);
  return Promise.race([promise, gate]);
}

/** Extracts first/submitted values per field from the bounded parse. */
function submittedValues(
  form: Awaited<ReturnType<typeof parseForm>>,
): Record<string, string | string[]> {
  const submitted: Record<string, string | string[]> = {};
  for (const field of form.fields) {
    if (field.name in submitted) continue;
    const values = form.getAll(field.name);
    submitted[field.name] = values.length > 1 ? [...values] : values[0]!;
  }
  return submitted;
}

/**
 * Runs the separated form workflow for one request: parse → validate →
 * (invalid) hand the adapter ready-made renderer data, or (valid) begin →
 * `run(input, context)` exactly once → resolve the fragment from the exact
 * domain result → commit → hand the adapter the fragment. A failure of
 * `run` or fragment resolution rolls back exactly once and rethrows; an
 * abort before `begin` or between the success stages never strands the
 * transaction — the checkpoint before `begin` stops cleanly, and a
 * checkpoint after `run` routes post-mutation aborts through rollback so
 * uncommitted work never survives as a commit lie.
 */
export async function executeExecutableFormAction<Input, Result>(
  context: Context,
  definition: ExecutableFormActionDefinition<Input, Result>,
  adapter: FormResponseAdapter,
): Promise<FormActionOutcome> {
  // Checkpoint 0 — before any work (BR-058).
  context.signal.throwIfAborted();

  // 1. bounded parse, raced against cancellation. The native parser may not
  // be signal-aware (documented residual limitation); our continuation stops
  // immediately and the eventual settlement is consumed safely above.
  const form = await raceAbort(parseForm(context), context.signal);
  context.signal.throwIfAborted();
  const submitted = submittedValues(form);

  // 2. identical business validation for both worlds (via the resolved port)
  context.signal.throwIfAborted(); // checkpoint: before validation
  const validation: FormValidationAdapter<Input> = resolveValidationAdapter(
    definition.schema,
    definition.validation,
  );
  const result = (await raceAbort(
    Promise.resolve(validation.validate(submitted)),
    context.signal,
  )) as ValidationResult<Input>;
  context.signal.throwIfAborted(); // checkpoint: after async validation

  // 3. invalid: adapter renders the form region (or document) with safe data
  if (!result.success) {
    const render: InvalidFormRender = validation.invalidRender(
      result,
      submitted,
    );
    context.signal.throwIfAborted(); // checkpoint: before invalid rendering
    const response = await adapter.invalid(context.request, {
      status: INVALID_SUBMISSION_STATUS,
      message: "Validation failed",
      render,
      formTarget: definition.formTarget,
    });
    return { kind: "invalid", response };
  }

  // 4. valid: exactly-once business execution inside the transaction hooks.
  // The pre-begin checkpoint keeps an abort from stranding an open
  // transaction; the checkpoint after `run` sends a post-mutation abort
  // through the rollback path instead of committing partial work.
  context.signal.throwIfAborted(); // checkpoint: before transaction begin
  let handle: unknown;
  if (definition.transaction !== undefined) {
    handle = await definition.transaction.begin();
  }
  let fragment: unknown;
  try {
    const value = await definition.run(result.value, context);
    context.signal.throwIfAborted(); // checkpoint: after run, before rendering
    fragment = await definition.buildFragment(value, context);
  } catch (error) {
    if (definition.transaction !== undefined) {
      await definition.transaction.rollback(handle);
    }
    throw error;
  }
  if (definition.transaction !== undefined) {
    await definition.transaction.commit(handle);
  }

  const response = await adapter.valid(context.request, {
    fragment,
    delivery: definition.delivery ?? {},
  });
  return { kind: "valid", response };
}
