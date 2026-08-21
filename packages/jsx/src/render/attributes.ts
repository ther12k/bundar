/**
 * HTML attribute serialization (GH-028).
 *
 * Deterministic attribute ordering, HTML boolean semantics, class/style
 * models, safe name validation, and value escaping that cannot break out of
 * double-quoted context. Event-handler attributes (`on*`) are rejected.
 */
import { escapeAttributeValue } from "../escape";

/** Thrown for attribute names that must never reach the output. */
export class UnsafeAttributeNameError extends Error {
  public constructor(name: string) {
    super(
      `unsafe attribute name ${JSON.stringify(name)}: names must start with a letter and contain only letters, digits, "-", "_", ":", or "."; event handlers (on*) are not supported`,
    );
    this.name = "UnsafeAttributeNameError";
  }
}

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_:.-]*$/;

/** Attributes that are true presence-boolean per HTML semantics. */
export const BOOLEAN_ATTRIBUTES: ReadonlySet<string> = new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "default",
  "defer",
  "disabled",
  "hidden",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected",
]);

export function isBooleanAttribute(name: string): boolean {
  return BOOLEAN_ATTRIBUTES.has(name.toLowerCase());
}

export function validateAttributeName(name: string): string {
  if (!NAME_PATTERN.test(name) || name.toLowerCase().startsWith("on")) {
    throw new UnsafeAttributeNameError(name);
  }
  return name;
}

/** Class values: string, or a collection of possibly-falsy entries. */
export type ClassValue =
  | string
  | number
  | null
  | undefined
  | boolean
  | readonly ClassValue[]
  | Readonly<Record<string, boolean>>;

export function serializeClass(value: ClassValue): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map(serializeClass)
      .filter((entry) => entry !== "")
      .join(" ");
  }
  // Record form: deterministic (sorted) so ordering never depends on key order.
  const record = value as Readonly<Record<string, boolean>>;
  return Object.keys(record)
    .filter((key) => record[key])
    .sort()
    .join(" ");
}

/** Style model: string pass-through or a record of CSS declarations. */
export type StyleValue =
  string | Readonly<Record<string, string | number | null | undefined>>;

const HYPHEN_PATTERN = /[A-Z]/g;

function cssPropertyName(key: string): string {
  return key.replace(HYPHEN_PATTERN, (letter) => `-${letter.toLowerCase()}`);
}

function cssPropertyValue(value: string | number): string {
  return typeof value === "number" ? String(value) : value;
}

export function serializeStyle(value: StyleValue): string {
  if (typeof value === "string") return value.trim();
  const record = value as Readonly<
    Record<string, string | number | null | undefined>
  >;
  const entries = Object.keys(record)
    .filter((key) => {
      const entry = record[key];
      return entry !== null && entry !== undefined;
    })
    .sort()
    .map(
      (key) =>
        `${cssPropertyName(key)}:${cssPropertyValue(record[key] as string | number)}`,
    );
  return entries.join(";");
}

export type SerializedAttribute = Readonly<{
  name: string;
  value: string | true;
}>;

/**
 * Serializes one attribute according to HTML semantics.
 *
 * - Boolean HTML attributes: `true` → bare presence, `false`/null/undefined →
 *   omitted entirely.
 * - `class` accepts the full ClassValue model; `style` the StyleValue model.
 * - Every string value is attribute-escaped (quotes neutralized).
 */
export function serializeAttribute(
  rawName: string,
  rawValue: unknown,
): SerializedAttribute | null {
  const name = validateAttributeName(rawName);
  const lower = name.toLowerCase();

  if (isBooleanAttribute(name)) {
    if (rawValue === true) return { name: lower, value: true };
    if (
      rawValue === false ||
      rawValue === null ||
      rawValue === undefined ||
      rawValue === ""
    ) {
      return null;
    }
    return { name: lower, value: escapeAttributeValue(String(rawValue)) };
  }

  if (rawValue === null || rawValue === undefined || rawValue === false) {
    return null;
  }

  if (lower === "class" || lower === "classname") {
    const text = serializeClass(rawValue as ClassValue);
    return text === ""
      ? null
      : { name: "class", value: escapeAttributeValue(text) };
  }

  if (lower === "style") {
    const text = serializeStyle(rawValue as StyleValue);
    return text === ""
      ? null
      : { name: "style", value: escapeAttributeValue(text) };
  }

  if (rawValue === true) {
    return { name: lower, value: true };
  }

  if (typeof rawValue === "number") {
    return { name: lower, value: escapeAttributeValue(String(rawValue)) };
  }

  return { name: lower, value: escapeAttributeValue(String(rawValue)) };
}

/**
 * Renders an attribute record into a deterministic attribute string
 * (leading space included when non-empty). Keys are emitted in sorted order.
 */
export function renderAttributes(
  attributes: Readonly<Record<string, unknown>>,
): string {
  const parts: string[] = [];
  for (const key of Object.keys(attributes).sort()) {
    if (key === "children" || key === "key") continue;
    const serialized = serializeAttribute(key, attributes[key]);
    if (!serialized) continue;
    parts.push(
      serialized.value === true
        ? serialized.name
        : `${serialized.name}="${serialized.value}"`,
    );
  }
  return parts.length === 0 ? "" : ` ${parts.join(" ")}`;
}
