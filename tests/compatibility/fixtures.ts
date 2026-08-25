/**
 * BR-073 shared fixture corpus: one version-specific pattern per upstream
 * htmx 2→4 category, plus a STABLE-SUBSET file with zero findings. The
 * official upgrade checker maps onto these same categories (see
 * artifacts/compatibility/checker-map.json).
 */

/** Stable subset: nothing here should ever trip the audit. */
export const STABLE_SOURCE = `
import { html } from "@bundar/core";

export const page = html(\`
  <form method="post" action="/api/save"><button type="submit">Save</button></form>
  <span id="status"></span>
\`);
`;

/** Each entry: [fixtureName, source, expectedRuleIdPrefix] */
export const VERSION_SENSITIVE_FIXTURES: readonly {
  readonly name: string;
  readonly source: string;
  readonly rulePrefix: string;
}[] = [
  {
    name: "renamed-header",
    // HX-Trigger is the documented v4 request-header alias in the adapter.
    source: `response.setHeader("HX-Trigger", "saved");`,
    rulePrefix: "header-rename",
  },
  {
    name: "approximate-event",
    // htmx:historyRestore is the documented APPROXIMATE mapping in the
    // v4 profile (divergent, provisional).
    source: `document.body.addEventListener("htmx:historyRestore", handler);`,
    rulePrefix: "event-approximate",
  },
  {
    name: "implicit-inheritance",
    source: `<div hx-get="/a" hx-target="closest section">go</div>`,
    rulePrefix: "implicit-inheritance",
  },
  {
    name: "extension-compat",
    source: `<div hx-ext="json-enc">x</div>`,
    rulePrefix: "extension-compat",
  },
  {
    name: "error-swap-assumption",
    source: `const res = { status: 404, text: "<p>nope</p>" };
swapInto("#target", res.text); // assumes errors never swap`,
    rulePrefix: "error-swap-assumption",
  },
  {
    name: "history-assumption",
    source: `const cacheSize = htmx.history ? htmx.history.cacheSize : 0;`,
    rulePrefix: "history-assumption",
  },
];
