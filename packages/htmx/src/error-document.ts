/**
 * Generic error document for ordinary (no-JS) failed submissions (BR-088).
 *
 * Extracted verbatim from the GH-060 form-action adapter so the additive
 * GH-183 facade reuses the SAME fallback document instead of duplicating
 * its delivery semantics: a role=alert summary WITHOUT field anchor links
 * — the generic document contains no form fields, so anchors would dangle.
 */
import { ErrorSummary, jsx } from "@bundar/jsx";
import type { PublicErrorView } from "./error-view";

/** The application-independent 4xx document used when no app renderer exists. */
export function genericErrorDocument(view: PublicErrorView): unknown {
  return jsx("html", {
    lang: "en",
    children: [
      jsx("head", {
        children: jsx("title", { children: `Error ${view.status}` }),
      }),
      jsx("body", {
        children: [
          jsx("h1", { children: view.message }),
          view.fieldErrors
            ? // links:false — the generic document contains no
              // form fields, so field anchors would dangle
              ErrorSummary({ errors: view.fieldErrors, links: false })
            : null,
        ],
      }),
    ],
  });
}
