/**
 * Version-neutral out-of-band and partial update intents (GH-051).
 *
 * Applications describe multi-region updates ONCE as stable intents — a DOM
 * region identity plus a swap operation — and dialect adapters serialize
 * them per capability: htmx 2 uses hx-swap-oob markup; the htmx 4 beta
 * profile documents its own OOB/partial strategy. Destructive vs additive
 * meaning is explicit per intent and never silently changed by an adapter;
 * duplicate targets and unsupported modes are diagnosed, not approximated.
 */
import { jsx, raw, renderToString, type JSXChild } from "@bundar/jsx";
import { isUnsupported } from "./capabilities";
import type { CapabilitySupport } from "./dialect";
import type { HtmxDialectAdapter } from "./dialect";

/** Stable region identity: an element id (primary) or a CSS selector. */
export interface UpdateTarget {
  /** DOM element id (preferred — ids are unambiguous). */
  readonly id: string;
  /** Optional CSS selector when the region has no id. */
  readonly selector?: string;
}

/** The swap operation for an intent. Destructive vs additive is explicit. */
export type UpdateOperation =
  /** Replace the target's content (destructive to old content). */
  | { readonly kind: "replace-content" }
  /** Replace the target element itself (destructive to the element). */
  | { readonly kind: "replace-element" }
  /** Append inside the target (additive). */
  | { readonly kind: "append" }
  /** Prepend inside the target (additive). */
  | { readonly kind: "prepend" }
  /** Remove the target element (destructive). */
  | { readonly kind: "remove" };

/** One multi-region update intent. */
export interface UpdateIntent {
  readonly target: UpdateTarget;
  readonly operation: UpdateOperation;
  /** Content for non-remove intents: a JSX tree or prebuilt HTML string. */
  readonly content?: JSXChild | string;
}

export class UpdateIntentError extends Error {
  public constructor(detail: string) {
    super(`update intent: ${detail}`);
    this.name = "UpdateIntentError";
  }
}

/** Serialized update: ready-to-emit markup + a compatibility report. */
export interface SerializedUpdates {
  /** The composed response body carrying every region update. */
  readonly html: string;
  /** Compatibility diagnostics per intent (raw mechanisms used). */
  readonly diagnostics: readonly UpdateDiagnostic[];
}

export interface UpdateDiagnostic {
  readonly targetId: string;
  /** The raw dialect mechanism the adapter chose (audit surface). */
  readonly mechanism: string;
  readonly capability: "out-of-band-swaps";
  readonly support: CapabilitySupport;
  readonly note: string;
}

function targetId(intent: UpdateIntent): string {
  return intent.target.id;
}

function validateIntents(intents: readonly UpdateIntent[]): void {
  if (intents.length === 0) {
    throw new UpdateIntentError("at least one update intent is required");
  }
  const seen = new Set<string>();
  for (const intent of intents) {
    const id = targetId(intent);
    if (id.length === 0) {
      throw new UpdateIntentError("every target needs an id");
    }
    if (seen.has(id)) {
      throw new UpdateIntentError(
        `duplicate target "${id}" — one region, one intent; combine operations instead`,
      );
    }
    seen.add(id);
    if (intent.operation.kind === "remove" && intent.content !== undefined) {
      throw new UpdateIntentError(
        `remove intent for "${id}" must not carry content`,
      );
    }
    if (intent.operation.kind !== "remove" && intent.content === undefined) {
      throw new UpdateIntentError(
        `intent for "${id}" (${intent.operation.kind}) requires content`,
      );
    }
  }
}

/** OOB swap values per operation — destructive/additive meaning preserved. */
const OOB_SWAP_BY_OPERATION: Record<UpdateOperation["kind"], string | null> = {
  "replace-content": "true", // default innerHTML semantics
  "replace-element": "outerHTML",
  append: "beforeend",
  prepend: "afterbegin",
  remove: "delete", // destructive removal stays explicit
};

/**
 * Serializes intents for a dialect. Both pinned dialects implement OOB
 * swaps, so the mechanism is hx-swap-oob markup today; the diagnostic
 * records the raw mechanism and the capability state so audits can track
 * dialect drift (e.g. a future dialect that changes or drops OOB).
 */
/**
 * Declarative update spec (BR-052): applications describe WHAT changes;
 * the dialect adapter decides HOW it reaches the wire. Applications never
 * construct raw `hx-swap-oob` markers or htmx 4 partial syntax.
 */
/** Friendly string form for specs; mapped onto {@link UpdateOperation}. */
export type UpdateSpecOperation =
  "replace-element" | "replace-content" | "append" | "prepend" | "remove";

export interface UpdateSpec {
  /** Target element id (without "#"). */
  readonly target: string;
  /** Defaults to "replace-element" (outerHTML semantics per dialect). */
  readonly operation?: UpdateSpecOperation;
  /** Rendered content for every operation except "remove". */
  readonly content?: unknown;
}

export interface FragmentSpec {
  /** Primary swap content (JSX node, string, or async component output). */
  readonly primary?: unknown;
  /** Normalized secondary updates applied out of band. */
  readonly updates?: readonly UpdateSpec[];
}

/**
 * Renders a fragment spec through the selected dialect: primary content
 * first, then normalized secondary intents. Applications never call
 * renderToString/serializeUpdates manually for this shape.
 */
export function composeFragment(
  spec: FragmentSpec,
  options: { dialect: HtmxDialectAdapter },
): string {
  if (
    spec.primary !== undefined &&
    typeof spec.primary === "object" &&
    spec.primary !== null &&
    "then" in spec.primary
  ) {
    // Explicit buffering rule (BR-052): secondary OOB ordering is only
    // guaranteed for fully-resolved primary content. Await async nodes at
    // the callsite, then compose.
    throw new UpdateIntentError(
      "primary is a Promise; await async nodes before composeFragment",
    );
  }
  const primary =
    spec.primary === undefined ? "" : renderToString(spec.primary);
  const updateList = spec.updates ?? [];
  if (updateList.length === 0) return primary;
  const intents: UpdateIntent[] = updateList.map((update) => {
    const operation = update.operation ?? "replace-element";
    const kind: UpdateOperation =
      operation === "replace-content"
        ? { kind: "replace-content" }
        : operation === "append"
          ? { kind: "append" }
          : operation === "prepend"
            ? { kind: "prepend" }
            : operation === "remove"
              ? { kind: "remove" }
              : { kind: "replace-element" };
    const intent: UpdateIntent = {
      target: { id: update.target },
      operation: kind,
      ...(update.content !== undefined
        ? { content: update.content as JSXChild | string }
        : {}),
    };
    return intent;
  });
  return primary + serializeUpdates(intents, options.dialect).html;
}

export function serializeUpdates(
  intents: readonly UpdateIntent[],
  adapter: HtmxDialectAdapter,
): SerializedUpdates {
  validateIntents(intents);

  const support = adapter.capabilities["out-of-band-swaps"];
  if (isUnsupported(adapter.capabilities, "out-of-band-swaps")) {
    throw new UpdateIntentError(
      `dialect ${adapter.id} does not support out-of-band swaps — use single-region updates for this dialect`,
    );
  }

  const diagnostics: UpdateDiagnostic[] = [];
  const parts: string[] = [];

  for (const intent of intents) {
    const swapValue = OOB_SWAP_BY_OPERATION[intent.operation.kind]!;
    const id = targetId(intent);

    if (intent.operation.kind === "remove") {
      // htmx delete semantics: a swap-oob="delete" element removes the target
      parts.push(renderToString(jsx("div", { id, "hx-swap-oob": "delete" })));
    } else {
      // wrap content in an element carrying the target id + OOB directive;
      // replace-content targets the region's inner HTML (the wrapper IS the
      // region content), others position relative to the region
      if (intent.operation.kind === "replace-content") {
        // the region element itself re-emits with its new content
        parts.push(
          renderToString(
            jsx("div", {
              id,
              "hx-swap-oob": swapValue,
              children: wrapContent(intent.content),
            }),
          ),
        );
      } else {
        // append/prepend/replace-element ride the same directive with the
        // corresponding swap value; content is the payload
        parts.push(
          renderToString(
            jsx("div", {
              id,
              "hx-swap-oob": swapValue,
              children: wrapContent(intent.content),
            }),
          ),
        );
      }
    }

    diagnostics.push({
      targetId: id,
      mechanism: `hx-swap-oob:${swapValue}`,
      capability: "out-of-band-swaps",
      support,
      note:
        support === "native"
          ? "native OOB serialization for this dialect"
          : `emulated/annotated OOB (dialect ${adapter.id}, ${adapter.maturity})`,
    });
  }

  return { html: parts.join("\n"), diagnostics };
}

function wrapContent(content: UpdateIntent["content"]): unknown {
  if (typeof content === "string") {
    // prebuilt strings stay verbatim markup (the explicit raw-HTML boundary)
    return raw(content);
  }
  return content;
}

/**
 * Compatibility audit of the raw mechanisms a serialization used —
 * applications and linters consume this to track dialect drift.
 */
export function auditUpdateMechanisms(
  serialized: SerializedUpdates,
): readonly string[] {
  return serialized.diagnostics.map(
    (diagnostic) =>
      `${diagnostic.targetId}: ${diagnostic.mechanism} (${diagnostic.support})`,
  );
}
