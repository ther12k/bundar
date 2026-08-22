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
