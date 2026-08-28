# @bundar/security API reference

<sub>Generated from the live public surface by `bun run docs:generate` . Drift fails the build — regenerate and commit together with the source change.</sub>

CSRF, sessions, flash, security headers/CSP.

## Runtime exports (42)

- `CSRF_FORM_FIELD`
- `CSRF_HEADER`
- `CookiePolicyError`
- `CsrfError`
- `FLASH_KEY`
- `FlashError`
- `MAX_FLASH_COUNT`
- `MAX_FLASH_MESSAGE_LENGTH`
- `ProductionPostureError`
- `SESSION`
- `SecurityHeaderError`
- `SessionError`
- `SessionStoreError`
- `addFlash`
- `assertProductionPosture`
- `assertSerializableSessionData`
- `buildCspHeader`
- `constantTimeEqual`
- `consumeFlash`
- `createCsrfSecret`
- `createInMemoryTokenStore`
- `createMemorySessionStore`
- `csrfMiddleware`
- `generateSessionId`
- `getNonce`
- `getSession`
- `isCanonicalSessionId`
- `isProxyTrusted`
- `issueCsrfToken`
- `issuePageCsrfToken`
- `peekFlash`
- `readCookieExact`
- `readCsrfTokenFromRequest`
- `requireProductionSessionCapabilities`
- `resolveClient`
- `resolveCookieSecure`
- `securityHeaders`
- `sessionMiddleware`
- `validateCookieAttributes`
- `verifyCsrfToken`
- `verifyOrigin`
- `withCsrfCookie`

## Type exports (26)

- `CookieAttributeContract`
- `CookieEnvironment`
- `CookieOriginInput`
- `CookieReadResult`
- `CsrfFailureReason`
- `CsrfMiddlewareOptions`
- `CsrfSecret`
- `CsrfVerdict`
- `FlashRecord`
- `FlashSeverity`
- `IssuedCsrfToken`
- `NonceContext`
- `OriginVerdict`
- `PostureViolation`
- `PostureViolationCode`
- `ProductionPostureInput`
- `ProxyTrustConfig`
- `ResolvedClient`
- `SecurityHeaderPolicy`
- `SessionData`
- `SessionHandle`
- `SessionMiddlewareOptions`
- `SessionStore`
- `SessionStoreCapabilities`
- `SessionStoreFailureKind`
- `TokenStore`
