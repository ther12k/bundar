/**
 * @bundar/htmx public surface (GH-039).
 *
 * Version-neutral protocol model: header constants, swap strategies, dialect
 * types, and request/response helpers. Versioned adapters are exported from
 * separate subpaths so callers do not load unused adapters.
 *
 * Boundary: this package must not import @bundar/core or @bundar/jsx.
 */
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
