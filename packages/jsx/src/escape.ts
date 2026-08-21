/**
 * HTML text escaping and primitive serialization (GH-027).
 *
 * Text context escaping covers `&`, `<`, and `>`. Attribute-value escaping
 * (GH-028 scope for full attributes) additionally neutralizes both quote
 * characters so hostile strings cannot break out of either quoting style.
 */
const TEXT_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

const ATTRIBUTE_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeWith(
  value: string,
  table: Readonly<Record<string, string>>,
): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacement = table[character];
    return replacement ?? character;
  });
}

/** Escapes a string for safe inclusion in HTML text content. */
export function escapeText(value: string): string {
  return escapeWith(value, TEXT_ESCAPES);
}

/** Escapes a string for safe inclusion inside a double- or single-quoted attribute value. */
export function escapeAttributeValue(value: string): string {
  return escapeWith(value, ATTRIBUTE_ESCAPES);
}

/** Rendering rejection for values that have no defined HTML text form. */
export class UnsupportedChildError extends Error {
  public readonly value: unknown;

  public constructor(value: unknown) {
    const described =
      typeof value === "object" && value !== null
        ? Object.prototype.toString.call(value)
        : `typeof ${typeof value}`;
    super(
      `unsupported JSX child ${described}: only string, number, bigint, ` +
        `null, undefined, and boolean are renderable as text; wrap objects ` +
        `in components or use the raw-HTML boundary (GH-031) explicitly`,
    );
    this.name = "UnsupportedChildError";
    this.value = value;
  }
}

/**
 * Omission contract: `null`, `undefined`, `true`, and `false` render as the
 * empty string. Strings escape; numbers and bigint use their canonical
 * `toString()` form (no locale formatting). Anything else is rejected with a
 * diagnostic instead of producing `[object Object]`.
 */
export function renderPrimitive(child: unknown): string {
  if (child === null || child === undefined) return "";
  const type = typeof child;
  if (type === "boolean") return "";
  if (type === "string") return escapeText(child as string);
  if (type === "number") {
    if (!Number.isFinite(child as number)) {
      throw new UnsupportedChildError(child);
    }
    return String(child);
  }
  if (type === "bigint") return `${child}`;
  throw new UnsupportedChildError(child);
}
