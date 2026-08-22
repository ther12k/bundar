/**
 * Attribute inheritance compatibility helpers (GH-047).
 *
 * In htmx 2, attributes inherit down the DOM tree by default unless explicitly
 * stopped with `hx-disinherit`. In htmx 4, inheritance rules are reworked.
 * Bundar models inheritance explicitly so components do not rely on implicit
 * upstream inheritance differences.
 */
import type { HtmxDialectAdapter } from "./dialect";
import { htmx2 } from "./dialects/v2/index";

export interface InheritanceDiagnostic {
  readonly attribute: string;
  readonly inheritsByDefault: boolean;
  readonly dialect: string;
  readonly note?: string;
}

export class InheritancePolicyError extends Error {
  public constructor(detail: string) {
    super(`inheritance policy: ${detail}`);
    this.name = "InheritancePolicyError";
  }
}

/** Known inheritable attributes in htmx 2. */
export const HTMX2_INHERITED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "hx-target",
  "hx-swap",
  "hx-boost",
  "hx-push-url",
  "hx-confirm",
  "hx-encoding",
  "hx-ext",
  "hx-headers",
  "hx-indicator",
  "hx-params",
  "hx-prompt",
  "hx-sync",
  "hx-validate",
]);

/**
 * Formats an `hx-disinherit` attribute value from a list of attribute names,
 * or "*" to disable all attribute inheritance.
 */
export function formatDisinherit(attributes: readonly string[] | "*"): string {
  if (attributes === "*") return "*";
  if (attributes.length === 0) {
    throw new InheritancePolicyError("disinherit list must not be empty");
  }
  return attributes
    .map((attr) => attr.trim())
    .filter((attr) => attr.length > 0)
    .join(" ");
}

/**
 * Diagnoses whether an attribute inherits by default in a given dialect.
 */
export function diagnoseInheritance(
  attribute: string,
  dialect: HtmxDialectAdapter = htmx2,
): InheritanceDiagnostic {
  const normalized = attribute.toLowerCase().trim();
  if (dialect.id === "htmx4") {
    return Object.freeze({
      attribute: normalized,
      inheritsByDefault: false,
      dialect: dialect.id,
      note: "htmx 4 reworks inheritance to be explicit-by-default; declare inheritance explicitly",
    });
  }
  const inherits = HTMX2_INHERITED_ATTRIBUTES.has(normalized);
  return Object.freeze({
    attribute: normalized,
    inheritsByDefault: inherits,
    dialect: dialect.id,
    note: inherits
      ? `htmx 2 inherits ${normalized} down the DOM by default`
      : `htmx 2 does not inherit ${normalized}`,
  });
}
