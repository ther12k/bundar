/**
 * Accessible error summary component (GH-059).
 *
 * Renders the field-error model from @bundar/schema as an accessible
 * summary — but without importing @bundar/schema (frozen boundary): the
 * props are structural. The summary lists the first error per field with
 * anchor links targeting the field's addressable id (dot paths map to dash
 * ids, e.g. `items.0.name` → `#items-0-name`), so keyboard and screen-reader
 * users can jump straight to the problem field. Renders nothing when the
 * model is empty; messages are escaped like all text.
 */
import { jsx } from "../jsx-runtime";

/** Structural mirror of @bundar/schema's FieldErrorModel (no import). */
export interface ErrorSummaryErrors {
  readonly order: readonly string[];
  readonly global: readonly string[];
  field(name: string): readonly string[];
  readonly first: ReadonlyArray<{
    readonly field: string;
    readonly message: string;
  }>;
  readonly empty: boolean;
}

export interface ErrorSummaryProps {
  readonly errors: ErrorSummaryErrors;
  /** Anchor id of the summary container; also used as the aria-labelledby. */
  readonly id?: string;
  readonly heading?: string;
  /**
   * Prefix prepended to field anchors when the form fields live inside a
   * container with its own id prefix.
   */
  readonly targetPrefix?: string;
}

/** Maps a dot-path field id to an addressable HTML id. */
export function fieldAnchorId(field: string, targetPrefix?: string): string {
  const id = field.replaceAll(".", "-");
  return targetPrefix === undefined ? id : `${targetPrefix}-${id}`;
}

export function ErrorSummary({
  errors,
  id = "error-summary",
  heading = "There is a problem",
  targetPrefix,
}: ErrorSummaryProps): unknown {
  if (errors.empty) return null;

  const fieldItems = errors.first.map((error) =>
    jsx("li", {
      key: error.field,
      children: jsx("a", {
        href: `#${fieldAnchorId(error.field, targetPrefix)}`,
        children: error.message,
      }),
    }),
  );
  const globalItems = errors.global.map((message, index) =>
    jsx("li", { key: `global-${index}`, children: message }),
  );

  return jsx("div", {
    id,
    role: "alert",
    "aria-labelledby": `${id}-title`,
    class: "bundar-error-summary",
    children: [
      jsx("h2", { id: `${id}-title`, children: heading }),
      jsx("ul", { children: [...fieldItems, ...globalItems] }),
    ],
  });
}
