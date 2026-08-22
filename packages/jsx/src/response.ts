/**
 * JSX Response integration (GH-033).
 *
 * `page()` and `fragment()` build native Responses from rendered JSX —
 * living in @bundar/jsx with NO import of @bundar/core (boundary rule:
 * consumers can render JSX responses without core internals).
 */
import { renderNode } from "./render/node";
import { renderNodeAuto } from "./render/async";
import { renderDocument } from "./document";

const HTML_CONTENT_TYPE = "text/html; charset=utf-8";

export interface ResponseOptions {
  readonly status?: number;
  readonly headers?: Record<string, string>;
  readonly signal?: AbortSignal;
}

function withContentType(
  userHeaders: Record<string, string> | undefined,
): Headers {
  const headers = new Headers(userHeaders);
  // Approved default; callers may override safely (last write wins per
  // Headers semantics below — we only set when absent to keep user intent).
  if (!headers.has("content-type")) {
    headers.set("content-type", HTML_CONTENT_TYPE);
  }
  return headers;
}

/** Fragment response: renders the tree as-is (no doctype). */
export function fragment(
  tree: unknown,
  options: ResponseOptions = {},
): Response | Promise<Response> {
  const auto = renderNodeAuto(tree, { signal: options.signal });
  if (typeof auto === "string") {
    return new Response(auto, {
      status: options.status ?? 200,
      headers: withContentType(options.headers),
    });
  }
  return auto.then(
    (html) =>
      new Response(html, {
        status: options.status ?? 200,
        headers: withContentType(options.headers),
      }),
  );
}

/**
 * Page response: renders a full document (doctype + single html root).
 * The tree must be a document — duplicate/absent html roots fail.
 */
export function page(
  tree: unknown,
  options: ResponseOptions = {},
): Response | Promise<Response> {
  const auto = renderNodeAuto(tree, { signal: options.signal });
  if (typeof auto === "string") {
    let html: string;
    try {
      html = renderDocument(tree, renderNode);
    } catch (error) {
      // reject (rather than sync-throw) so both page() paths behave
      // identically for awaiting handlers
      return Promise.reject(error);
    }
    return new Response(html, {
      status: options.status ?? 200,
      headers: withContentType(options.headers),
    });
  }
  return auto.then((html) => {
    const matches = html.match(/<html[> ]/gi);
    if ((matches?.length ?? 0) !== 1) {
      throw new Error(
        `page(): tree must contain exactly one <html> root (got ${matches?.length ?? 0})`,
      );
    }
    return new Response(`<!doctype html>${html}`, {
      status: options.status ?? 200,
      headers: withContentType(options.headers),
    });
  });
}
