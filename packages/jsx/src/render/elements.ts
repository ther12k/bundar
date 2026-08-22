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
 * data can never terminate the host element early.
 *
 * - script/style are RAW text (browsers do NOT decode entities there), so
 *   the escape must live in the host grammar: `<\/` for script and `\3c `
 *   for CSS.
 * - textarea/title are RCDATA (browsers DO decode character references), so
 *   entity-escaping is both safe and lossless — the browser's .value/text
 *   round-trips the original text exactly (GH-036 browser comparison).
 */
export function serializeRawText(tag: string, text: string): string {
  const kind = tag.toLowerCase();
  if (kind === "style") {
    // CSS: escape `<` and `</` safely without affecting rules
    return text.replace(/<\//g, "\\3c /");
  }
  if (kind === "script") {
    // script: escape the sequence that could close the tag
    return text.replace(/<\//g, "<\\/");
  }
  // textarea/title (RCDATA): entity-escaped text decodes back losslessly
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
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
