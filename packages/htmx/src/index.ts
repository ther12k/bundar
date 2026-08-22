/**
 * @bundar/htmx public surface (GH-039–GH-042, GH-048).
 *
 * Version-neutral protocol model: header constants, swap strategies, dialect
 * types, and request/response helpers. The capability-aware adapter interface
 * (GH-040), normalized request metadata (GH-041), response directives
 * (GH-042), and page/fragment negotiation (GH-048) live here; versioned
 * adapters are exported from separate subpaths so callers do not load unused
 * adapters.
 *
 * Boundary: this package must not import @bundar/core; @bundar/jsx is the
 * one allowed workspace dependency (ADR-0016), used by view() for rendering.
 */
export {
  applyDirectives,
  DirectiveConflictError,
  DirectiveValidationError,
  encodeDirectives,
  normalizeDirectives,
} from "./directives";
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
export {
  negotiateView,
  view,
  VIEW_VARY_HEADERS,
  ViewDefinitionError,
} from "./view";
export type {
  NegotiatedView,
  NegotiationReason,
  ViewContent,
  ViewDefinition,
  ViewOptions,
  ViewRepresentation,
} from "./view";
