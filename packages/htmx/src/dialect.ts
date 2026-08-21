/**
 * Capability-aware HTMX dialect adapter interface (GH-040).
 *
 * Every upstream version difference passes through one small, data-oriented
 * interface. The interface itself contains no v2-only or v4-only field names;
 * dialect-specific detail lives in each adapter's own metadata.
 */

/** How a capability is realized by a dialect. */
export type CapabilitySupport = "native" | "emulated" | "unsupported";

/** Neutral capability identifiers owned by this interface. */
export type HtmxCapability =
  | "request-metadata"
  | "response-directives"
  | "trigger-after-swap"
  | "trigger-after-settle"
  | "out-of-band-swaps"
  | "history-actions"
  | "cache-control";

export type CapabilityMap = Readonly<Record<HtmxCapability, CapabilitySupport>>;

/** Version-neutral decoded HTMX request metadata (GH-041 owns the decoder). */
export interface HtmxRequestMetadata {
  readonly isHtmx: boolean;
  readonly isBoosted: boolean;
  readonly target: string | null;
  readonly trigger: string | null;
  readonly triggerName: string | null;
  readonly currentUrl: string | null;
  readonly prompt: string | null;
}

/** Version-neutral response directive (GH-042 owns the encoder). */
export type HtmxResponseDirective =
  | { readonly kind: "reswap"; readonly strategy: string }
  | { readonly kind: "retarget"; readonly selector: string }
  | { readonly kind: "reselect"; readonly selector: string }
  | { readonly kind: "redirect"; readonly url: string }
  | { readonly kind: "location"; readonly url: string }
  | { readonly kind: "refresh" }
  | { readonly kind: "push-url"; readonly url: string | false }
  | { readonly kind: "replace-url"; readonly url: string }
  | {
      readonly kind: "trigger";
      readonly events: ReadonlyArray<{
        readonly name: string;
        readonly detail?: unknown;
      }>;
    };

/** Neutral asset descriptor (GH-045 owns the registry). */
export interface HtmxAssetDescriptor {
  readonly source: "bundled" | "cdn" | "custom";
  readonly version: string;
  readonly integrity: string | null;
}

/** Adapter maturity classification. */
export type HtmxAdapterMaturity = "stable" | "experimental";

/** Compatibility diagnostic produced by adapters. */
export interface HtmxCompatibilityDiagnostic {
  readonly capability: HtmxCapability;
  readonly support: CapabilitySupport;
  readonly message: string;
}

/**
 * The dialect adapter contract. Adapters must be immutable and safe to reuse
 * across requests — all methods are pure functions over their inputs.
 */
export interface HtmxDialectAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly maturity: HtmxAdapterMaturity;
  /** Exact upstream version range this adapter supports, semver syntax. */
  readonly supportedRange: string;
  readonly capabilities: CapabilityMap;
  /** Dialect-owned metadata; keys are namespaced by the adapter, never by the interface. */
  readonly metadata: Readonly<Record<string, unknown>>;

  decodeRequest(request: Request): HtmxRequestMetadata;
  encodeResponseDirective(directive: HtmxResponseDirective): Headers;
  describeAsset(): HtmxAssetDescriptor;
  diagnose(capability: HtmxCapability): HtmxCompatibilityDiagnostic;
}
