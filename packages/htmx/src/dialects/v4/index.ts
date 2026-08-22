/**
 * HTMX 4 EXPERIMENTAL dialect adapter — full beta6 profile (GH-044).
 *
 * htmx 4 is NOT GA. This adapter is version-pinned to 4.0.0-beta6 and must
 * not be used in production. Every provisional assumption is annotated.
 * When htmx 4 reaches GA, GH-089–GH-096 gates must pass before this adapter
 * can be promoted to stable; GA revalidation is MANDATORY.
 *
 * The adapter shares the neutral GH-041 request decoder and GH-042 directive
 * encoder with the stable v2 adapter; beta-only behavior surfaces through
 * the profile record, capability classifications (emulated/unsupported), and
 * documented migration differences — never by altering the stable lane.
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

export const HTMX4_TESTED_VERSION = "4.0.0-beta6";
export const HTMX4_ASSET_SHA256 =
  "28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25";

/**
 * Provisional beta6 profile. Every field marked [provisional] reflects
 * observed beta behavior, not a compatibility promise; GA revalidation is
 * mandatory before any field may be treated as stable.
 */
export const HTMX4_PROFILE = Object.freeze({
  testedVersion: HTMX4_TESTED_VERSION,
  assetSha256: HTMX4_ASSET_SHA256,
  gaClaim:
    "none — htmx 4 is beta; no GA compatibility claim; GA revalidation is mandatory before any stable promotion",
  requestHeaders: Object.freeze([
    "HX-Request",
    "HX-Boosted",
    "HX-Current-URL",
    "HX-History-Restore-Request",
    "HX-Prompt",
    "HX-Target",
    "HX-Trigger",
    "HX-Trigger-Name",
    // beta6 additions observed upstream [provisional]
    "HX-Source",
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
  requestSemantics: Object.freeze({
    // v4 renames trigger → source semantics for the initiating element;
    // the neutral decoder maps HX-Source onto sourceElement via aliases.
    sourceHeader: "HX-Source [provisional]",
    representationSemantics:
      "fragment negotiation identical to v2 [provisional]",
  }),
  lifecycle: Object.freeze({
    // GH-008 browser evidence: beta6 did NOT fire the htmx2 lifecycle event
    // string; afterRequest observed false under the beta build.
    observedAfterRequest: false,
    eventPhases: "phases renamed/reworked in v4 [provisional]",
    emulatedEvents: Object.freeze([
      "trigger-after-swap",
      "trigger-after-settle",
    ]),
  }),
  history: Object.freeze({
    pushUrlDefault: true, // [provisional]
    replaceUrlSupported: true,
    historyCacheRework: "v4 reworks history cache internals [provisional]",
  }),
  errorBehavior: Object.freeze({
    // v4 changes default error swap behavior [provisional]
    defaultErrorSwap: "none-by-default (changed from v2 target swap)",
    migrationNote:
      "servers relying on v2 error-into-target must configure explicitly",
  }),
  inheritance: Object.freeze({
    // v4 removes opt-in inherit-attrs behavior present in v2 core
    attributeInheritance: false,
    migrationNote: "explicit inheritance helpers required (GH-047)",
  }),
  extensions: Object.freeze({
    changes: "extension API reworked in v4 [provisional]",
    partials: "first-class partials support added [provisional]",
    streaming: "response streaming support added [provisional]",
  }),
  unsupported: Object.freeze([
    "cache-control policy (no beta6 surface observed — unsupported until GA)",
  ]),
  migrationDifferences: Object.freeze([
    {
      topic: "lifecycle events",
      difference: "phases reworked; v2 event strings not fired",
      status: "fixture: GH-054 lane",
    },
    {
      topic: "error swap default",
      difference: "none-by-default vs v2 target swap",
      status: "documented record",
    },
    {
      topic: "attribute inheritance",
      difference: "removed from core; explicit helpers needed",
      status: "explicit unsupported record (GH-047)",
    },
    {
      topic: "extensions API",
      difference: "reworked",
      status: "explicit unsupported record",
    },
    {
      topic: "cache-control",
      difference: "no beta6 surface",
      status: "explicit unsupported record",
    },
  ]),
});

function decode(request: Request): HtmxRequestMetadata {
  return normalizeHtmxRequest(request, {
    headerAliases: { "HX-Trigger": "HX-Source" },
  });
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
    // emulated per GH-008 beta observations until GA evidence (GH-054)
    "trigger-after-swap": "emulated",
    "trigger-after-settle": "emulated",
    "out-of-band-swaps": "native",
    "history-actions": "native",
    "cache-control": "unsupported",
  }),
  metadata: Object.freeze({
    "htmx4:pinnedVersion": HTMX4_TESTED_VERSION,
    // GH-074: the beta sends the trigger under HX-Source; canonical name
    // elsewhere. Carried as adapter data so test clients never branch.
    requestHeaderAliases: { "HX-Trigger": "HX-Source" },
    "htmx4:assetIntegrity": `sha256-${HTMX4_ASSET_SHA256}`,
    "htmx4:gaClaim": HTMX4_PROFILE.gaClaim,
    "htmx4:profile": HTMX4_PROFILE,
  }),
  decodeRequest: decode,
  encodeResponseDirective: encode,
  describeAsset: () =>
    Object.freeze({
      source: "bundled",
      version: HTMX4_TESTED_VERSION,
      integrity: `sha256-${HTMX4_ASSET_SHA256}`,
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
        ? "htmx 4 beta6 exposes no cache-control surface; unsupported until GA revalidation"
        : `htmx ${HTMX4_TESTED_VERSION} provides ${capability} (emulated items reflect observed beta behavior; GA revalidation mandatory)`,
  }),
} satisfies HtmxDialectAdapter);
