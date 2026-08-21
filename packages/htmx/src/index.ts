/**
 * @bundar/htmx public surface (GH-039, GH-040).
 *
 * Version-neutral protocol model: header constants, swap strategies, dialect
 * types, and request/response helpers. The capability-aware adapter interface
 * (GH-040) lives here; versioned adapters are exported from separate subpaths
 * so callers do not load unused adapters.
 *
 * Boundary: this package must not import @bundar/core or @bundar/jsx.
 */
export {
  capabilities,
  isEmulated,
  isNative,
  isUnsupported,
} from "./capabilities";
export type {
  CapabilityMap,
  CapabilitySupport,
  HtmxAdapterMaturity,
  HtmxAssetDescriptor,
  HtmxCapability,
  HtmxCompatibilityDiagnostic,
  HtmxDialectAdapter,
  HtmxRequestMetadata,
  HtmxResponseDirective,
} from "./dialect";
export {
  HTMX_REQUEST_HEADERS,
  HTMX_RESPONSE_HEADERS,
  getHtmxTarget,
  getHtmxTrigger,
  isBoostedRequest,
  isHtmxRequest,
  withHtmxHeaders,
} from "./neutral";

export type {
  HtmxDialect,
  HtmxDialectVersion,
  HtmxRequestHeader,
  HtmxResponseHeader,
  HtmxSwapStrategy,
} from "./neutral";
