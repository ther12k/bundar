/**
 * Progressive action response composer (GH-050).
 *
 * One explicit action result serves both worlds from a single handler:
 * enhanced (HTMX) submissions receive the fragment plus response
 * directives/events, and ordinary form submissions receive the classic
 * Post/Redirect/Get fallback. The composer owns ONLY response composition —
 * transaction/business logic stays in the handler. Validation fails before
 * any response is committed: a missing fallback redirect is an error unless
 * the route explicitly opts out, conflicting fields are diagnosed at
 * build time, and status values are range-checked.
 */
import { applyCachePolicy, cachePolicyFor } from "./cache-policy";
import { applyDirectives } from "./directives";
import type { HtmxResponseDirective } from "./dialect";
import { negotiateView, VIEW_VARY_HEADERS } from "./view";
import { normalizeHtmxRequest } from "./request";
import type { HtmxDialectAdapter } from "./dialect";
import { fragment as fragmentResponse } from "@bundar/jsx";

/** Approved redirect statuses for the no-JS fallback (PRG pattern). */
export type ActionRedirectStatus = 303 | 302 | 301 | 307 | 308;

/** Allowed body statuses for enhanced responses (204 excluded — a
 * fragment body is mandatory, so a no-content status would be a lie). */
export type ActionBodyStatus = 200 | 201 | 202 | 422;

export interface ActionRedirect {
  readonly kind: "redirect";
  readonly location: string;
  readonly status: ActionRedirectStatus;
}

export interface ActionOptOut {
  readonly kind: "opt-out";
}

/** An explicit action result (use the `action()` builder). */
export interface ActionResult {
  /** Fragment content for enhanced submissions (JSX tree or string). */
  readonly fragment: unknown;
  /**
   * Ordinary-submission fallback: Post/Redirect/Get target. REQUIRED unless
   * `noFallbackRedirect: true` opts the route out explicitly.
   */
  readonly redirect: ActionRedirect | ActionOptOut | null;
  /** Body status for the enhanced response. Default 200. */
  readonly status: ActionBodyStatus;
  /** HTMX response directives (retarget, reswap, triggers, …). */
  readonly directives: readonly HtmxResponseDirective[];
  /** Fail-safe cache policy application for the enhanced response. */
  readonly privateContent?: boolean;
}

export class ActionDefinitionError extends Error {
  public constructor(detail: string) {
    super(`action(): ${detail}`);
    this.name = "ActionDefinitionError";
  }
}

export interface ActionOptions {
  /** Fragment for enhanced submissions: a JSX tree or an HTML string. */
  readonly fragment: unknown;
  /** Post/Redirect/Get fallback target for ordinary submissions. */
  readonly redirectTo?: string;
  readonly redirectStatus?: ActionRedirectStatus;
  /**
   * Explicit opt-out for routes that intentionally have no fallback
   * redirect (e.g. enhanced-only endpoints). Ordinary submissions then
   * receive the fragment as a plain response with the action status.
   */
  readonly noFallbackRedirect?: boolean;
  readonly status?: ActionBodyStatus;
  readonly directives?: readonly HtmxResponseDirective[];
  readonly privateContent?: boolean;
}

/**
 * Builds and validates the action result at handler time — every conflict
 * or missing-field error fires HERE, before any response is committed.
 */
export function action(options: ActionOptions): ActionResult {
  if (options.fragment === undefined || options.fragment === null) {
    throw new ActionDefinitionError(
      "fragment is required — an action must say what enhanced clients render",
    );
  }
  if (options.noFallbackRedirect === true && options.redirectTo !== undefined) {
    throw new ActionDefinitionError(
      "conflicting fields: noFallbackRedirect cannot combine with redirectTo",
    );
  }
  if (options.redirectTo === undefined && options.noFallbackRedirect !== true) {
    throw new ActionDefinitionError(
      "missing fallback redirect — ordinary form submissions need a Post/Redirect/Get target; pass redirectTo, or noFallbackRedirect: true to opt the route out explicitly",
    );
  }
  if (
    options.redirectStatus !== undefined &&
    options.redirectTo === undefined
  ) {
    throw new ActionDefinitionError(
      "conflicting fields: redirectStatus without redirectTo",
    );
  }
  const redirect: ActionResult["redirect"] =
    options.redirectTo === undefined
      ? { kind: "opt-out" }
      : {
          kind: "redirect",
          location: options.redirectTo,
          status: options.redirectStatus ?? 303,
        };
  return {
    fragment: options.fragment,
    redirect,
    status: options.status ?? 200,
    directives: options.directives ?? [],
    privateContent: options.privateContent,
  };
}

/**
 * Composes the response for one request: enhanced submissions get the
 * fragment (rendered, with directives applied, the negotiation Vary, and
 * the fail-safe cache policy); ordinary submissions get the approved PRG
 * redirect (or, when the route opted out, the fragment as a plain body).
 */
export async function composeAction(
  request: Request,
  result: ActionResult,
  options: { readonly dialect?: HtmxDialectAdapter } = {},
): Promise<Response> {
  const metadata =
    options.dialect !== undefined
      ? options.dialect.decodeRequest(request)
      : normalizeHtmxRequest(request);
  const negotiated = negotiateView(metadata);

  if (negotiated.representation === "fragment") {
    // jsx's fragment() renders both trees and prebuilt strings; async
    // trees return a promise, so resolve before composing headers
    const base = await Promise.resolve(
      fragmentResponse(result.fragment, { status: result.status }),
    );
    const withDirectives = applyDirectives(base, result.directives);
    return applyCachePolicy(
      withDirectives,
      cachePolicyFor(negotiated, {
        private: result.privateContent === true,
      }),
    );
  }

  // Ordinary submission: Post/Redirect/Get with the approved status.
  if (result.redirect?.kind === "redirect") {
    return new Response(null, {
      status: result.redirect.status,
      headers: { location: result.redirect.location },
    });
  }
  // Explicit opt-out: serve the fragment body plainly to everyone.
  return fragmentResponse(result.fragment, { status: result.status });
}

/** A full handler-ready action composition (always awaited for handlers). */
export async function actionResponse(
  request: Request,
  result: ActionResult,
  options: { readonly dialect?: HtmxDialectAdapter } = {},
): Promise<Response> {
  return await Promise.resolve(composeAction(request, result, options));
}

export const ACTION_VARY_HEADERS: readonly string[] = VIEW_VARY_HEADERS;
