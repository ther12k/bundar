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
  const { lang, charset = "utf-8", title, children } = options;
  return jsx("html", {
    ...(lang ? { lang } : {}),
    children: [
      jsx("head", {
        children: [
          jsx("meta", { charset }),
          ...(title !== undefined ? [jsx("title", { children: title })] : []),
        ],
      }),
      jsx("body", { ...(children !== undefined ? { children } : {}) }),
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
