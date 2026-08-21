/**
 * @bundar/htmx public surface (GH-039–GH-041).
 *
 * Version-neutral protocol model: header constants, swap strategies, dialect
 * types, and request/response helpers. The capability-aware adapter interface
 * (GH-040) and normalized request metadata (GH-041) live here; versioned
 * adapters are exported from separate subpaths so callers do not load unused
 * adapters.
 *
 * Boundary: this package must not import @bundar/core or @bundar/jsx.
 */
export { normalizeHtmxRequest, MalformedHtmxHeaderError } from "./request";
export type {
  HtmxFieldStatus,
  HtmxRequestKind,
  HtmxTrustLevel,
  NormalizedHtmxField,
  NormalizedHtmxRequest,
  RawHeadersDiagnostic,
} from "./request";
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
