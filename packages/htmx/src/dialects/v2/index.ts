/**
 * HTMX 2 stable dialect adapter — full profile (GH-043).
 *
 * Pins the exact tested upstream version (htmx 2.0.10, SHA-256 recorded in
 * evidence/gh-008) and wires the v2 header surface onto the neutral request
 * metadata (GH-041) and response directives (GH-042). Lifecycle/event,
 * inheritance, history/error, and extension notes live in the profile
 * record; anything the neutral contract does not model is documented as
 * unimplemented rather than silently approximated.
 */
import { capabilities } from "../../capabilities";
import { normalizeHtmxRequest } from "../../request";
import { encodeDirectives } from "../../directives";
import type {
  HtmxCapability,
  HtmxDialectAdapter,
  HtmxRequestMetadata,
  HtmxResponseDirective,
} from "../../dialect";

export const HTMX2_TESTED_VERSION = "2.0.10";
export const HTMX2_ASSET_SHA256 =
  "71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de";

/**
 * Documented v2 profile facts. Unimplemented upstream features are listed
 * explicitly; the neutral contract never approximates them silently.
 */
export const HTMX2_PROFILE = Object.freeze({
  testedVersion: HTMX2_TESTED_VERSION,
  assetSha256: HTMX2_ASSET_SHA256,
  requestHeaders: Object.freeze([
    "HX-Request",
    "HX-Boosted",
    "HX-Current-URL",
    "HX-History-Restore-Request",
    "HX-Prompt",
    "HX-Target",
    "HX-Trigger",
    "HX-Trigger-Name",
  ]),
  responseHeaders: Object.freeze([
    "HX-Location",
    "HX-Push-URL",
    "HX-Redirect",
    "HX-Refresh",
    "HX-Replace-URL",
    "HX-Reselect",
    "HX-Reswap",
    "HX-Retarget",
    "HX-Trigger",
    "HX-Trigger-After-Settle",
    "HX-Trigger-After-Swap",
  ]),
  lifecycle: Object.freeze({
    // GH-008 browser evidence: afterRequest fires under htmx 2.0.10
    observedAfterRequest: true,
    eventOrder: ["beforeSwap", "afterSwap", "afterSettle"],
  }),
  history: Object.freeze({
    pushUrlDefault: true,
    replaceUrlSupported: true,
    historyRestoreRequestHeader: true,
  }),
  errorBehavior: Object.freeze({
    // v2: error responses swap into target by default unless configured
    defaultErrorSwap: "target",
    configuredErrorSwapTargets: true,
  }),
  inheritance: Object.freeze({
    // hx-* attributes inherit from parent elements (hx-boost, hx-target…)
    attributeInheritance: true,
    inheritAttrsExtension: "bundled (ext/inherit-attrs.js is core in v2)",
  }),
  extensions: Object.freeze({
    // upstream 2.x extensions exercised by the profile
    supported: Object.freeze([
      "json-enc",
      "morphdom-swap",
      "client-side-templates",
      "path-deps",
      "class-tools",
      "boosted-form",
    ]),
    notes:
      "v2 bundles inherit-attrs behavior in core; remaining extensions are opt-in scripts.",
  }),
  unimplemented: Object.freeze([
    "hx-vals js: prefix (arbitrary JS evaluation — deliberately not modeled)",
    "sse/websocket extensions (streaming transports out of neutral scope until GH-034/GH-051)",
  ]),
});

function decode(request: Request): HtmxRequestMetadata {
  return normalizeHtmxRequest(request);
}

function encode(directive: HtmxResponseDirective): Headers {
  return encodeDirectives([directive]);
}

export const htmx2: HtmxDialectAdapter = Object.freeze({
  id: "htmx2",
  displayName: "HTMX 2",
  maturity: "stable",
  supportedRange: ">=2.0.0 <3.0.0",
  capabilities: capabilities({
    "request-metadata": "native",
    "response-directives": "native",
    "trigger-after-swap": "native",
    "trigger-after-settle": "native",
    "out-of-band-swaps": "native",
    "history-actions": "native",
    "cache-control": "native",
  }),
  metadata: Object.freeze({
    "htmx2:pinnedVersion": HTMX2_TESTED_VERSION,
    "htmx2:assetIntegrity": `sha256-${HTMX2_ASSET_SHA256}`,
    "htmx2:profile": HTMX2_PROFILE,
  }),
  decodeRequest: decode,
  encodeResponseDirective: encode,
  describeAsset: () =>
    Object.freeze({
      source: "bundled",
      version: HTMX2_TESTED_VERSION,
      integrity: `sha256-${HTMX2_ASSET_SHA256}`,
    }),
  diagnose: (capability: HtmxCapability) => ({
    capability,
    support: "native",
    message: `htmx ${HTMX2_TESTED_VERSION} supports ${capability} natively`,
  }),
} satisfies HtmxDialectAdapter);
