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
  issuePageCsrfToken,
  readCsrfTokenFromRequest,
  withCsrfCookie,
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
export { generateSessionId, isCanonicalSessionId } from "./session/id";
export { createMemorySessionStore } from "./session/store";
export type { SessionData, SessionStore } from "./session/store";
export {
  getSession,
  SESSION,
  SessionError,
  sessionMiddleware,
} from "./session/middleware";
export type {
  SessionHandle,
  SessionMiddlewareOptions,
} from "./session/middleware";
export {
  addFlash,
  consumeFlash,
  FLASH_KEY,
  FlashError,
  MAX_FLASH_COUNT,
  MAX_FLASH_MESSAGE_LENGTH,
  peekFlash,
} from "./flash";
export type { FlashRecord, FlashSeverity } from "./flash";
export {
  buildCspHeader,
  getNonce,
  securityHeaders,
  SecurityHeaderError,
} from "./headers";
export type { NonceContext, SecurityHeaderPolicy } from "./headers";

export { isProxyTrusted, resolveClient } from "./proxy";
export type { ProxyTrustConfig, ResolvedClient } from "./proxy";
export { SessionStoreError } from "./session/store";
export { requireProductionSessionCapabilities } from "./session/store";
export { assertSerializableSessionData } from "./session/store";
export type { SessionStoreCapabilities } from "./session/store";
export type { SessionStoreFailureKind } from "./session/store";

export {
  CookiePolicyError,
  resolveCookieSecure,
  validateCookieAttributes,
} from "./cookies";
export type {
  CookieAttributeContract,
  CookieEnvironment,
  CookieOriginInput,
} from "./cookies";

export { assertProductionPosture, ProductionPostureError } from "./posture";
export type {
  PostureViolation,
  PostureViolationCode,
  ProductionPostureInput,
} from "./posture";
