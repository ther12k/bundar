/**
 * Full-page and fragment negotiation (GH-048).
 *
 * One route serves a complete document to ordinary navigation and an HTML
 * fragment to enhanced requests, decided from normalized request metadata —
 * handlers never touch raw HTMX headers. Negotiation facts:
 *
 * - normal navigation → document (valid HTML without any JavaScript);
 * - standard enhanced request (`HX-Request`) → fragment only;
 * - boosted navigation (`HX-Boosted`) → document: htmx swaps the `<body>`
 *   out of a full page, so a fragment would strip the shell;
 * - history restore (`HX-History-Restore-Request`) → document: a restored
 *   cache entry must be installable as a page, never a fragment.
 *
 * Every response carries `Vary` naming the exact wire headers the
 * representation depends on, and `negotiateView()` exposes the chosen
 * representation plus those inputs so cache/history policy (GH-049) can key
 * on them without re-deriving the rules.
 */
import {
  fragment as fragmentResponse,
  page as pageResponse,
} from "@bundar/jsx";
import type { HtmxDialectAdapter } from "./dialect";
import { normalizeHtmxRequest, type NormalizedHtmxRequest } from "./request";

/** Which representation a request negotiated for. */
export type ViewRepresentation = "document" | "fragment";

/** Why a representation was chosen. */
export type NegotiationReason =
  | "normal-navigation"
  | "boosted-navigation"
  | "history-restore"
  | "enhanced-request";

export interface NegotiatedView {
  readonly representation: ViewRepresentation;
  readonly reason: NegotiationReason;
  /**
   * Exact wire headers the representation varies on. These are the cache-key
   * inputs for representation identity (consumed by GH-049's policy).
   */
  readonly vary: readonly string[];
}

/** Canonical negotiation inputs; frozen and shared by every negotiation. */
export const VIEW_VARY_HEADERS: readonly string[] = Object.freeze([
  "HX-Request",
  "HX-Boosted",
  "HX-History-Restore-Request",
]);

/** Thrown when a view definition cannot produce the negotiated representation. */
export class ViewDefinitionError extends Error {
  public constructor(detail: string) {
    super(`view(): ${detail}`);
    this.name = "ViewDefinitionError";
  }
}

/** Anything renderable as HTML (a JSX tree, or a prebuilt string). */
export type ViewContent = unknown;

export interface ViewDefinition {
  /** Fragment-only content for enhanced swaps; rendered without the layout. */
  readonly fragment: () => ViewContent | Promise<ViewContent>;
  /** Explicit full-document path; optional when `layout` is provided. */
  readonly page?: () => ViewContent | Promise<ViewContent>;
  /**
   * Builds the document around the fragment content when `page` is absent.
   * Invoked only for document representations, never for fragments.
   */
  readonly layout?: (
    content: ViewContent,
  ) => ViewContent | Promise<ViewContent>;
}

export interface ViewOptions {
  /**
   * Decode the request through a dialect adapter (applying its header
   * aliases); defaults to the neutral decoder with canonical names.
   */
  readonly dialect?: HtmxDialectAdapter;
  readonly status?: number;
  readonly headers?: Record<string, string>;
}

/**
 * Pure negotiation over normalized metadata. Deterministic and side-effect
 * free so cache/history policy can reuse the exact rule the renderer used.
 */
export function negotiateView(metadata: NormalizedHtmxRequest): NegotiatedView {
  if (metadata.kind === "history-restore") {
    return {
      representation: "document",
      reason: "history-restore",
      vary: VIEW_VARY_HEADERS,
    };
  }
  if (metadata.kind === "boosted") {
    return {
      representation: "document",
      reason: "boosted-navigation",
      vary: VIEW_VARY_HEADERS,
    };
  }
  if (metadata.isHtmx) {
    return {
      representation: "fragment",
      reason: "enhanced-request",
      vary: VIEW_VARY_HEADERS,
    };
  }
  return {
    representation: "document",
    reason: "normal-navigation",
    vary: VIEW_VARY_HEADERS,
  };
}

/**
 * Negotiates and renders one route's two representations. The returned
 * response is a full document (doctype + single `<html>` root enforced by
 * the JSX page helper) or a bare fragment, each with the negotiation
 * `Vary` header applied.
 */
export async function view(
  request: Request,
  definition: ViewDefinition,
  options: ViewOptions = {},
): Promise<Response> {
  const metadata =
    options.dialect !== undefined
      ? options.dialect.decodeRequest(request)
      : normalizeHtmxRequest(request);
  const negotiated = negotiateView(metadata);

  const varyValue = negotiated.vary.join(", ");
  const headers: Record<string, string> = { ...options.headers };
  headers.vary =
    headers.vary === undefined ? varyValue : `${headers.vary}, ${varyValue}`;
  const responseOptions = { status: options.status, headers };

  if (negotiated.representation === "fragment") {
    return fragmentResponse(await definition.fragment(), responseOptions);
  }
  if (definition.page !== undefined) {
    return pageResponse(await definition.page(), responseOptions);
  }
  if (definition.layout !== undefined) {
    const content = await definition.fragment();
    return pageResponse(await definition.layout(content), responseOptions);
  }
  throw new ViewDefinitionError(
    "a document representation requires page() or layout()",
  );
}
