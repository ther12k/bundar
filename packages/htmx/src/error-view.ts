/**
 * Page-versus-fragment error negotiation (GH-065).
 *
 * Error PRESENTATION is separated from error CLASSIFICATION: the boundary
 * (GH-020) classifies thrown values into public envelopes; this module
 * decides how an error state renders for the request that caused it —
 * a full error document for ordinary navigation, a local fragment (form
 * region, modal region) for enhanced requests, or an empty body with safe
 * retarget/reswap hints. Client-supplied targets are NEVER authorization:
 * retarget hints flow only to statuses where leaking a selector is
 * harmless, and protected-content failures render generic content.
 *
 * htmx 2 vs htmx 4 error-swap differences are adapter data, not guesses:
 * v2 swaps error responses into the target by default; v4 does not —
 * `errorSwapMode` reads the pinned profile so a fragment error is
 * delivered in the way each dialect will actually render.
 */
import { negotiateView } from "./view";
import { normalizeHtmxRequest } from "./request";
import type { HtmxDialectAdapter } from "./dialect";
import type { HtmxResponseDirective } from "./dialect";
import { applyDirectives } from "./directives";
import { applyCachePolicy, cachePolicyFor } from "./cache-policy";
import {
  ErrorSummary,
  page as pageResponse,
  renderToStringAsync,
  type ErrorSummaryErrors,
  jsx,
} from "@bundar/jsx";

/** How an error should be presented for the failing request. */
export type ErrorPresentationMode =
  "document" | "fragment" | "modal-region" | "empty";

/** The explicit presentation policy an application provides. */
export interface ErrorPresentationPolicy {
  /** Full-document renderer for ordinary navigations. Receives the public
   * envelope (status, code, message) — never the raw error. */
  readonly renderDocument: (view: PublicErrorView) => unknown;
  /**
   * Deliberate opt-in for fragment rendering of 401/403 failures on
   * enhanced requests — only for apps whose auth-error fragments contain
   * no protected content. Absent (the default), auth failures always take
   * the document path.
   */
  readonly renderAuthFragment?: (view: PublicErrorView) => unknown;
  /** Local fragment renderer for enhanced requests (e.g. the form region
   * re-rendered with field errors). */
  readonly renderFragment?: (view: PublicErrorView) => unknown;
  /** Distinct modal/region renderer, if the app uses one. */
  readonly renderModalRegion?: (view: PublicErrorView) => unknown;
  /**
   * Server-known region selector for fragment errors (e.g. "#form-card").
   * Never derived from client input — the client's HX-Target is display
   * context, not authorization.
   */
  readonly fragmentTarget?: string;
}

/** The public, safe-to-render error facts (from GH-020's classification). */
export interface PublicErrorView {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  /** Field-error model for validation failures (GH-059), if provided. */
  readonly fieldErrors?: ErrorSummaryErrors;
  /** Correlation id for logs — rendered nowhere, returned for handlers. */
  readonly correlationId?: string;
}

export class ErrorPresentationError extends Error {
  public constructor(detail: string) {
    super(`error presentation: ${detail}`);
    this.name = "ErrorPresentationError";
  }
}

/** How each dialect delivers an error-status fragment (pinned data). */
export type ErrorSwapMode = "target-swap" | "no-swap";

export function errorSwapMode(adapter?: HtmxDialectAdapter): ErrorSwapMode {
  if (adapter === undefined) {
    // neutral default: the htmx 2 stable behavior (swap into target)
    return "target-swap";
  }
  const metadata = adapter.metadata as Record<string, unknown>;
  const profileKey = Object.keys(metadata).find((key) =>
    key.endsWith(":profile"),
  );
  const profile =
    profileKey === undefined
      ? undefined
      : (metadata[profileKey] as {
          errorBehavior?: { defaultErrorSwap?: string };
        });
  const swap = profile?.errorBehavior?.defaultErrorSwap ?? "";
  if (swap.startsWith("none")) return "no-swap";
  return "target-swap";
}

export interface ErrorViewOptions {
  readonly dialect?: HtmxDialectAdapter;
}

/**
 * Chooses the presentation mode: enhanced requests render fragments (or
 * modal regions / empty bodies when the app configures them); ordinary and
 * document-negotiating requests render full documents. Authorization
 * failures on enhanced requests NEVER receive protected fragment content —
 * the generic document path applies unless the app provides an explicitly
 * safe fragment renderer.
 */
function chooseMode(
  status: number,
  negotiatedFragment: boolean,
  policy: ErrorPresentationPolicy,
): ErrorPresentationMode {
  if (!negotiatedFragment) return "document";
  if (status === 401 || status === 403) {
    // Protected content: enhanced auth failures render the DOCUMENT unless
    // the app EXPLICITLY opts its auth errors into fragment rendering via
    // renderAuthFragment — the generic fragment renderer must not decide
    // what protected failures expose.
    return policy.renderAuthFragment === undefined ? "document" : "fragment";
  }
  if (policy.renderModalRegion !== undefined) return "modal-region";
  if (policy.renderFragment !== undefined) return "fragment";
  return "empty";
}

/**
 * Composes the error response for one request from the public error view.
 * Safe by construction: content-type text/html, no-store, negotiation Vary,
 * escaped output via the JSX renderers, and retarget hints only for
 * fragment deliveries where the selector is server-known.
 */
export async function errorViewResponse(
  request: Request,
  view: PublicErrorView,
  policy: ErrorPresentationPolicy,
  options: ErrorViewOptions = {},
): Promise<Response> {
  const metadata =
    options.dialect !== undefined
      ? options.dialect.decodeRequest(request)
      : normalizeHtmxRequest(request);
  const negotiated = negotiateView(metadata);
  const mode = chooseMode(
    view.status,
    negotiated.representation === "fragment",
    policy,
  );
  const swapMode = errorSwapMode(options.dialect);

  if (mode === "document") {
    const tree = policy.renderDocument(view);
    // full documents go through jsx's page() — doctype + single html root
    const response =
      typeof tree === "string"
        ? new Response(tree, {
            status: view.status,
            headers: { "content-type": "text/html; charset=utf-8" },
          })
        : await Promise.resolve(
            pageResponse(tree as never, { status: view.status }),
          );
    return applyCachePolicy(
      response,
      cachePolicyFor(negotiated, { private: true }),
    );
  }

  if (mode === "empty") {
    const response = new Response(null, {
      status: view.status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    return applyCachePolicy(
      response,
      cachePolicyFor(negotiated, { private: true }),
    );
  }

  const renderer =
    mode === "modal-region"
      ? policy.renderModalRegion!
      : view.status === 401 || view.status === 403
        ? policy.renderAuthFragment!
        : policy.renderFragment!;
  const tree = renderer(view);
  const body =
    typeof tree === "string" ? tree : await renderToStringAsync(tree);

  const directives: HtmxResponseDirective[] = [];
  const retargeted = mode === "fragment" && policy.fragmentTarget !== undefined;
  if (retargeted) {
    // server-known target only — client targets are display context. The
    // fragment REPLACES the region element, so pair the retarget with an
    // explicit outerHTML reswap — otherwise htmx reuses the triggering
    // element's own swap style (e.g. beforeend) and NESTS the re-rendered
    // form inside the stale one (BR-075 live-browser evidence).
    directives.push({ kind: "retarget", selector: policy.fragmentTarget });
    directives.push({ kind: "reswap", strategy: "outerHTML" });
  }
  if (swapMode === "no-swap" && !retargeted) {
    // htmx 4 does not swap error responses by default: explicitly tell it
    // to swap so the fragment actually reaches the region. When a retarget
    // was issued above, its outerHTML pairing already covers this.
    directives.push({ kind: "reswap", strategy: "innerHTML" });
  }

  const base = new Response(body, {
    status: view.status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  return applyCachePolicy(
    applyDirectives(base, directives),
    cachePolicyFor(negotiated, { private: true }),
  );
}

/**
 * Convenience builder for a validation (422) public view with the GH-059
 * field-error model — handlers pass their toFieldErrors() output.
 */
export function validationErrorView(
  fieldErrors: ErrorSummaryErrors,
  message = "Validation failed",
): PublicErrorView {
  return { status: 422, code: "unprocessable", message, fieldErrors };
}

/** Renders the standard field-error summary fragment for a validation view. */
export function renderValidationErrorFragment(view: PublicErrorView): unknown {
  if (view.fieldErrors === undefined) {
    throw new ErrorPresentationError(
      "validation view is missing its fieldErrors model",
    );
  }
  return jsx("div", {
    class: "bundar-error-region",
    children: ErrorSummary({ errors: view.fieldErrors }),
  });
}
