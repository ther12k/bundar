/**
 * HTMX 4 EXPERIMENTAL dialect adapter.
 *
 * htmx 4 is NOT GA. This adapter is version-pinned to 4.0.0-beta6 and must
 * not be used in production. The browser harness (GH-008) observed that the
 * beta's lifecycle events differ from htmx 2; those differences surface here
 * as emulated/unsupported capabilities rather than being hidden.
 *
 * When htmx 4 reaches GA, GH-089–GH-096 gates must be passed before this
 * adapter can be promoted to stable.
 */
import { capabilities } from "./capabilities";
import { normalizeHtmxRequest } from "./request";
import { encodeDirectives } from "./directives";
import type {
  HtmxCapability,
  HtmxDialectAdapter,
  HtmxRequestMetadata,
  HtmxResponseDirective,
} from "./dialect";

function decode(request: Request): HtmxRequestMetadata {
  return normalizeHtmxRequest(request);
}

function encode(directive: HtmxResponseDirective): Headers {
  return encodeDirectives([directive]);
}

export const htmx4Experimental: HtmxDialectAdapter = Object.freeze({
  id: "htmx4",
  displayName: "HTMX 4 (experimental)",
  maturity: "experimental",
  supportedRange: ">=4.0.0-beta.0 <4.1.0",
  capabilities: capabilities({
    "request-metadata": "native",
    "response-directives": "native",
    // GH-008 observed the beta did not fire the htmx2 lifecycle event string;
    // after-swap/after-settle are emulated until GA evidence lands (GH-054).
    "trigger-after-swap": "emulated",
    "trigger-after-settle": "emulated",
    "out-of-band-swaps": "native",
    "history-actions": "native",
    "cache-control": "unsupported",
  }),
  metadata: Object.freeze({
    "htmx4:pinnedVersion": "4.0.0-beta6",
    "htmx4:assetIntegrity":
      "sha256-28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25",
    "htmx4:gaClaim": "none — htmx 4 is beta; no GA compatibility claim",
  }),
  decodeRequest: decode,
  encodeResponseDirective: encode,
  describeAsset: () =>
    Object.freeze({
      source: "bundled",
      version: "4.0.0-beta6",
      integrity:
        "sha256-28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25",
    }),
  diagnose: (capability: HtmxCapability) => ({
    capability,
    support:
      capability === "cache-control"
        ? "unsupported"
        : capability === "trigger-after-swap" ||
            capability === "trigger-after-settle"
          ? "emulated"
          : "native",
    message:
      capability === "cache-control"
        ? "htmx 4 beta6 does not expose cache-control; unsupported until GA"
        : `htmx 4.0.0-beta6 provides ${capability} (emulated capabilities reflect GH-008 beta observations)`,
  }),
} satisfies HtmxDialectAdapter);
