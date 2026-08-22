/**
 * Void and raw-text element serialization (GH-032).
 *
 * Void elements never receive closing tags. Raw-text elements (script,
 * style) follow documented escaping boundaries: their text children are not
 * HTML-escaped (per HTML spec) but `</script`-style close sequences are
 * neutralized so content cannot break out.
 */

/** HTML void elements — no closing tag ever. */
export const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

/** Raw-text elements — text children are not entity-escaped. */
export const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set([
  "script",
  "style",
  "textarea",
  "title",
]);

export function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag.toLowerCase());
}

export function isRawTextElement(tag: string): boolean {
  return RAW_TEXT_ELEMENTS.has(tag.toLowerCase());
}

/**
 * Neutralizes element-close sequences inside raw-text content so payload
 * data can never terminate the host element early. `<` is escaped as
 * `\u003c` in script contexts and `\3c` in CSS (both valid in their
 * respective grammars and invisible to the rendered text).
 */
export function serializeRawText(tag: string, text: string): string {
  if (tag.toLowerCase() === "style") {
    // CSS: escape `<` and `</` safely without affecting rules
    return text.replace(/<\//g, "\\3c /");
  }
  // script/textarea/title: escape the sequence that could close the tag
  return text.replace(/<\//g, "<\\/");
}

export const DOCTYPE = "<!doctype html>";

/**
 * Document layout options — explicit, never inferred.
 */
export interface DocumentOptions {
  readonly lang?: string;
  readonly charset?: string;
  readonly title?: string;
}
