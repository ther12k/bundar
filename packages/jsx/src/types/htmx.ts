/**
 * Typed common HTMX attributes (GH-035).
 *
 * String-literal types for the stable, dialect-common `hx-*` attribute
 * subset, merged into every intrinsic element. Raw attribute names stay
 * visible — no wrapper components — and the JSX runtime stays independent
 * of @bundar/htmx (types only; zero runtime coupling). Attributes the rich
 * grammar makes impractical to enumerate (triggers, extended modifiers)
 * are deliberately typed as open strings with the grammar documented here.
 *
 * Experimental/dialect-specific attributes are NOT global: augment the
 * `HtmxExperimentalAttributes` interface via declaration merging to enable
 * them deliberately — nothing leaks into other apps' element types.
 */

/** Core swap strategies shared by both dialects (htmx 2 and htmx 4 beta). */
export type HxSwapBase =
  | "innerHTML"
  | "outerHTML"
  | "afterbegin"
  | "beforebegin"
  | "afterend"
  | "beforeend"
  | "none";

/** Swap strategies may carry timing/scroll/view modifiers after the base. */
export type HxSwapValue = HxSwapBase | `${HxSwapBase} ${string}`;

/**
 * hx-target values: primarily a CSS selector (`#list`, `.card`), or one of
 * the modifier forms. `string & {}` keeps the literal completions while
 * accepting any selector — grammar validation belongs to the dialect
 * adapters, not the type.
 */
export type HxTargetValue =
  | "this"
  | "next"
  | "previous"
  | `closest ${string}`
  | `find ${string}`
  | `next ${string}`
  | `previous ${string}`
  | (string & {});

/** hx-push-url accepts the boolean forms plus an explicit URL. */
export type HxPushUrlValue = boolean | "true" | "false" | `${string}`;

/** hx-params: all, none, a list, or not-prefixed list. */
export type HxParamsValue = "*" | "none" | string;

/**
 * The stable common subset: attributes present in htmx 2 and the htmx 4
 * beta with the same meaning. Values the grammar makes unenumerable stay
 * open strings on purpose — validating them is the dialect adapters' job
 * (@bundar/htmx), never the JSX runtime's.
 */
export type HtmxStableAttributes = Readonly<{
  /** Issue a GET to this URL on the configured trigger. */
  "hx-get"?: string;
  /** Issue a POST to this URL on the configured trigger. */
  "hx-post"?: string;
  /** Issue a PUT to this URL on the configured trigger. */
  "hx-put"?: string;
  /** Issue a PATCH to this URL on the configured trigger. */
  "hx-patch"?: string;
  /** Issue a DELETE to this URL on the configured trigger. */
  "hx-delete"?: string;
  /**
   * Where the response swaps in: a selector or a modifier form
   * (`this`, `closest x`, `find x`, `next x`, `previous x`).
   */
  "hx-target"?: HxTargetValue;
  /**
   * Swap strategy, optionally followed by modifiers
   * (`outerHTML swap:100ms settle:200ms`, `innerHTML scroll:top`).
   */
  "hx-swap"?: HxSwapValue;
  /**
   * Trigger grammar: event names with filters, delays, throttles, and
   * `from:`/`target:`/`consume`/`queue:` modifiers. Open string — the
   * grammar is open-ended by design; dialect adapters document it.
   */
  "hx-trigger"?: string;
  /** Boost child anchors/forms into htmx requests. */
  "hx-boost"?: boolean;
  /** Push the request URL into history (boolean forms or an explicit URL). */
  "hx-push-url"?: HxPushUrlValue;
  /** Confirmation prompt text shown before issuing the request. */
  "hx-confirm"?: string;
  /** Disable htmx processing for this element and its children. */
  "hx-disable"?: boolean | "";
  /** Disable attribute inheritance for the listed attributes. */
  "hx-disinherit"?: string;
  /** Use multipart/form-data encoding for parameters. */
  "hx-encoding"?: "multipart/form-data";
  /** Load the listed htmx extensions for this element. */
  "hx-ext"?: string;
  /** Additional headers for requests issued by this element. */
  "hx-headers"?: string;
  /** Mark this element as the history snapshot boundary. */
  "hx-history-elt"?: boolean | "";
  /** Include additional element values in requests. */
  "hx-include"?: string;
  /** Selector of the request indicator element to toggle. */
  "hx-indicator"?: string;
  /** Filter which parameters are submitted (`*`, `none`, lists, `not x`). */
  "hx-params"?: HxParamsValue;
  /** Do not destroy this element during swaps. */
  "hx-preserve"?: boolean | "";
  /** Prompt text; the answer becomes the `prompt` flow parameter. */
  "hx-prompt"?: string;
  /** Replace the current browser URL instead of pushing. */
  "hx-replace-url"?: boolean | "true" | "false" | `${string}`;
  /** Extra attributes to add to the request. */
  "hx-request"?: string;
  /** Process only the selected fragment of the response. */
  "hx-select"?: string;
  /** Select and swap out-of-band content from the response. */
  "hx-select-oob"?: string;
  /** Mark this element as out-of-band swap content. */
  "hx-swap-oob"?: string;
  /** Coordinate multiple elements issuing requests to the same resource. */
  "hx-sync"?: string;
  /** Run element-level validation before issuing requests. */
  "hx-validate"?: boolean | "true" | "false";
}>;

/**
 * Deliberately-empty by default. Apps enabling experimental or
 * dialect-specific attributes augment this interface via declaration
 * merging — the additions apply only to that app's compilation:
 *
 * ```ts
 * declare module "@bundar/jsx" {
 *   interface HtmxExperimentalAttributes {
 *     "hx-on:click"?: string;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the empty interface IS the opt-in augmentation point; apps merge experimental attributes in via declaration merging
export interface HtmxExperimentalAttributes {}

/** Everything available on intrinsic elements: stable + app-augmented. */
export type HtmxAttributes = HtmxStableAttributes & HtmxExperimentalAttributes;
