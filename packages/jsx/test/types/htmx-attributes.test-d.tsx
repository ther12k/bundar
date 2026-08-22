/**
 * GH-035 type-level tests (TSX — the only place element attribute types are
 * enforced): common htmx attributes typecheck on normal intrinsic elements,
 * invalid values are rejected, and experimental attributes are opt-in via
 * declaration merging without widening to any. Compiled by the package
 * typecheck; every @ts-expect-error asserts a rejection.
 */

// --- stable attributes typecheck on ordinary intrinsic elements ---
export const stable = (
  <>
    <button hx-get="/items" hx-trigger="click delay:100ms">
      Load
    </button>
    <div hx-target="#list" hx-swap="outerHTML swap:50ms settle:100ms" />
    <a hx-boost={true} hx-push-url={true} href="/x">
      link
    </a>
    <form
      hx-post="/save"
      hx-encoding="multipart/form-data"
      hx-validate={true}
    />
    <input hx-trigger="keyup changed delay:500ms from:this" />
    <div hx-preserve={true} hx-history-elt="" />
    <span hx-indicator="#spinner" hx-sync="closest form:abort" />
    <div hx-params="not password" hx-disinherit="hx-target" />
  </>
);

// --- literal unions reject invalid values at compile time ---
// @ts-expect-error hx-encoding is a literal; free strings rejected
export const badEncoding = <form hx-encoding="text/plain" />;
// @ts-expect-error hx-swap base must be a known strategy
export const badSwap = <div hx-swap="sideways" />;
// @ts-expect-error hx-target needs a selector after `closest `
export const bareClosest = <div hx-target="closest " />;
// @ts-expect-error hx-boost is boolean, not a string
export const badBoost = <div hx-boost="yes" />;
// @ts-expect-error unknown experimental attributes stay rejected until enabled
export const unknownExperimental = <button hx-on:load="x" />;

// --- experimental attributes are opt-in per app compilation ---
declare module "@bundar/jsx" {
  interface HtmxExperimentalAttributes {
    "hx-on:click"?: string;
  }
}
export const experimental = <button hx-on:click="htmx.toggle(this)" />;

void [
  stable,
  badEncoding,
  badSwap,
  bareClosest,
  badBoost,
  unknownExperimental,
  experimental,
];
