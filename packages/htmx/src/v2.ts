/**
 * HTMX 2 stable dialect adapter.
 * Pinned to htmx 2.0.10 (SHA-256 captured in evidence/gh-008).
 */
import { capabilities } from "./capabilities";
import type {
  HtmxCapability,
  HtmxDialectAdapter,
  HtmxRequestMetadata,
  HtmxResponseDirective,
} from "./dialect";

function decode(request: Request): HtmxRequestMetadata {
  return Object.freeze({
    isHtmx: request.headers.get("HX-Request") === "true",
    isBoosted: request.headers.get("HX-Boosted") === "true",
    target: request.headers.get("HX-Target"),
    trigger: request.headers.get("HX-Trigger"),
    triggerName: request.headers.get("HX-Trigger-Name"),
    currentUrl: request.headers.get("HX-Current-URL"),
    prompt: request.headers.get("HX-Prompt"),
  });
}

function encode(directive: HtmxResponseDirective): Headers {
  const headers = new Headers();
  switch (directive.kind) {
    case "reswap":
      headers.set("HX-Reswap", directive.strategy);
      break;
    case "retarget":
      headers.set("HX-Retarget", directive.selector);
      break;
    case "reselect":
      headers.set("HX-Reselect", directive.selector);
      break;
    case "redirect":
      headers.set("HX-Redirect", directive.url);
      break;
    case "location":
      headers.set("HX-Location", directive.url);
      break;
    case "refresh":
      headers.set("HX-Refresh", "true");
      break;
    case "push-url":
      headers.set(
        "HX-Push-URL",
        directive.url === false ? "false" : directive.url,
      );
      break;
    case "replace-url":
      headers.set("HX-Replace-URL", directive.url);
      break;
    case "trigger":
      headers.set(
        "HX-Trigger",
        JSON.stringify(
          Object.fromEntries(
            directive.events.map((event) => [event.name, event.detail ?? {}]),
          ),
        ),
      );
      break;
  }
  return headers;
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
    "htmx2:pinnedVersion": "2.0.10",
    "htmx2:assetIntegrity":
      "sha256-71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de",
  }),
  decodeRequest: decode,
  encodeResponseDirective: encode,
  describeAsset: () =>
    Object.freeze({
      source: "bundled",
      version: "2.0.10",
      integrity:
        "sha256-71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de",
    }),
  diagnose: (capability: HtmxCapability) => ({
    capability,
    support: "native",
    message: `htmx 2.0.10 supports ${capability} natively`,
  }),
} satisfies HtmxDialectAdapter);
