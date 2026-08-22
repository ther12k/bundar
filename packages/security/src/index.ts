/**
 * @bundar/security public surface (GH-061, ADR-0017).
 *
 * CSRF token primitives, origin verification, and the unsafe-method form
 * middleware. Imports @bundar/core's public surface only; nothing imports
 * this package except applications and tests.
 */
export {
  constantTimeEqual,
  createCsrfSecret,
  createInMemoryTokenStore,
  CSRF_FORM_FIELD,
  CSRF_HEADER,
  CsrfError,
  csrfMiddleware,
  issueCsrfToken,
  verifyCsrfToken,
  verifyOrigin,
} from "./csrf";
export type {
  CsrfFailureReason,
  CsrfMiddlewareOptions,
  CsrfSecret,
  CsrfVerdict,
  IssuedCsrfToken,
  OriginVerdict,
  TokenStore,
} from "./csrf";
