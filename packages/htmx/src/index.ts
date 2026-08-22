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
  buildHtmxRequestHeaders,
  HTMX_REQUEST_HEADERS,
  HTMX_RESPONSE_HEADERS,
  getHtmxTarget,
  getHtmxTrigger,
  isBoostedRequest,
  isHtmxRequest,
  withHtmxHeaders,
} from "./neutral";
export type { HtmxRequestHeaderOptions } from "./neutral";

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
export {
  applyCachePolicy,
  CACHE_VARY_HEADERS,
  CachePolicyError,
  cachePolicyFor,
  historyPolicyFor,
  mergeVary,
} from "./cache-policy";
export type {
  CachePolicy,
  CachePolicyOptions,
  HistoryPolicy,
} from "./cache-policy";
export {
  action,
  actionResponse,
  ACTION_VARY_HEADERS,
  ActionDefinitionError,
  composeAction,
} from "./action";
export type {
  ActionBodyStatus,
  ActionOptOut,
  ActionOptions,
  ActionRedirect,
  ActionRedirectStatus,
  ActionResult,
} from "./action";
export {
  errorSwapMode,
  errorViewResponse,
  ErrorPresentationError,
  renderValidationErrorFragment,
  validationErrorView,
} from "./error-view";
export type {
  ErrorPresentationMode,
  ErrorPresentationPolicy,
  ErrorSwapMode,
  ErrorViewOptions,
  PublicErrorView,
} from "./error-view";
export { INVALID_SUBMISSION_STATUS, runFormAction } from "./form-action";
export type {
  FormActionDefinition,
  FormActionOutcome,
  InvalidFormRender,
} from "./form-action";
export {
  auditUpdateMechanisms,
  serializeUpdates,
  UpdateIntentError,
} from "./updates";
export type {
  SerializedUpdates,
  UpdateDiagnostic,
  UpdateIntent,
  UpdateOperation,
  UpdateTarget,
} from "./updates";
export {
  createHtmxAssetHandler,
  getBundledAsset,
  validateAssetDialectMatch,
  AssetDialectMismatchError,
  AssetRegistryError,
} from "./assets";
export type { CreateHtmxAssetHandlerOptions, HtmxAsset } from "./assets";
export { HtmxScript } from "./script";
export type { HtmxScriptProps } from "./script";
export {
  createApplicationEvent,
  getEventMappingTable,
  rawDialectEvent,
  resolveDialectEvent,
  EventDefinitionError,
} from "./events";
export type {
  BundarLifecycleEvent,
  EventMapping,
  EventMappingKind,
  HtmxApplicationEvent,
  RawDialectEvent,
} from "./events";
export {
  diagnoseInheritance,
  formatDisinherit,
  HTMX2_INHERITED_ATTRIBUTES,
  InheritancePolicyError,
} from "./inheritance";
export type { InheritanceDiagnostic } from "./inheritance";
export {
  diagnoseExtension,
  formatExtensionAttribute,
  rawExtension,
  ExtensionPolicyError,
  HTMX_2_COMPAT_EXTENSION,
  OFFICIAL_EXTENSIONS,
} from "./extensions";
export type {
  ExtensionDiagnostic,
  HtmxExtensionDescriptor,
  RawExtension,
} from "./extensions";
export {
  composeNavigation,
  htmxLocation,
  htmxRedirect,
  htmxRefresh,
  validateRedirectUrl,
  InvalidRedirectUrlError,
} from "./navigation";
export type {
  ComposeNavigationOptions,
  HtmxLocationConfig,
  RedirectUrlOptions,
} from "./navigation";
