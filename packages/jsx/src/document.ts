/**
 * Document helpers (GH-032): explicit doctype/document structure with
 * minimal head/title/meta support — deliberately not a head-management
 * framework.
 */
import { jsx } from "./jsx-runtime";
import { DOCTYPE } from "./render/elements";
import type { JSXChild } from "./types";

export { DOCTYPE };

/** Document layout options — explicit; nothing is inferred. */
export interface DocumentOptions {
  /** `<html lang>` — omit for no lang attribute (no default). */
  readonly lang?: string;
  /** `<meta charset>` — defaults to "utf-8" when the document helper is used. */
  readonly charset?: string;
  readonly title?: string;
  /**
   * BR-065: per-response CSP nonce. When set, every TOP-LEVEL `<script>`
   * child receives `nonce="<value>"` unless it already has one — enabling
   * strict CSP (`script-src 'nonce-…'`, no unsafe-inline) without touching
   * each script call-site.
   */
  readonly cspNonce?: string;
  /**
   * Additional `<head>` content after charset/title — meta tags (e.g.
   * htmx client config), preloads, styles. BR-087: htmx 2 reads its
   * `<meta name="htmx-config">` from head placement at load time.
   */
  readonly head?: import("./types").JSXChild;
}

/** Thrown when a document tree contains nested or duplicate html roots. */
export class DuplicateDocumentRootError extends Error {
  public constructor() {
    super(
      "duplicate document root: <html> may appear exactly once in a document tree",
    );
    this.name = "DuplicateDocumentRootError";
  }
}

/**
 * Builds the document skeleton: html[lang] > head(charset, title?) +
 * body(children). This is a component (returns JSX), so it composes with
 * everything else; `renderDocument` prepends the doctype.
 */
export function document(
  options: DocumentOptions & { children?: JSXChild },
): JSXChild {
  const { lang, charset = "utf-8", title, cspNonce, head, children } = options;

  // JSX nodes are FROZEN, so stamping RE-CREATES script nodes that lack a
  // nonce. Originals are never shared across responses (fresh trees per
  // request), so per-response nonces stay single-use.
  const stampNonce = (node: unknown): unknown => {
    if (cspNonce === undefined || typeof node !== "object" || node === null)
      return node;
    if (Array.isArray(node)) return node.map(stampNonce);
    const n = node as {
      type?: unknown;
      props?: Record<string, unknown> & { children?: unknown };
    };
    if (
      typeof n.type !== "string" ||
      typeof n.props !== "object" ||
      n.props === null
    )
      return node;

    if (n.type === "script") {
      return n.props["nonce"] !== undefined
        ? node
        : jsx("script", { ...n.props, nonce: cspNonce });
    }
    if (n.props.children !== undefined) {
      return jsx(n.type, {
        ...n.props,
        children: stampNonce(n.props.children),
      });
    }
    return node;
  };

  const stampedChildren =
    children === undefined
      ? undefined
      : Array.isArray(children)
        ? children.map(stampNonce)
        : [stampNonce(children)];

  return jsx("html", {
    ...(lang ? { lang } : {}),
    children: [
      jsx("head", {
        children: [
          jsx("meta", { charset }),
          ...(title !== undefined ? [jsx("title", { children: title })] : []),
          ...(head !== undefined ? [head] : []),
        ],
      }),
      jsx("body", {
        ...(stampedChildren !== undefined ? { children: stampedChildren } : {}),
      }),
    ],
  });
}

/** Counts `<html` opening tags in rendered output to detect duplicates. */
function countHtmlRoots(html: string): number {
  const matches = html.match(/<html[> ]/gi);
  return matches?.length ?? 0;
}

/**
 * Full-document render: `<!doctype html>` + the tree. Exactly one html root
 * is required — zero means the caller passed a fragment/element tree (fine
 * for doctype-less output but invalid here); two or more fail clearly.
 */
export function renderDocument(
  tree: unknown,
  render: (node: unknown) => string,
): string {
  const html = render(tree);
  if (countHtmlRoots(html) !== 1) {
    throw new DuplicateDocumentRootError();
  }
  return `${DOCTYPE}${html}`;
}
