# @bundar/security API reference

<sub>Generated from the live public surface by `bun run docs:generate` (GH-079). Drift fails the build — regenerate and commit together with the source change.</sub>

CSRF, sessions, flash, security headers/CSP.

## Runtime exports (28)

- `CSRF_FORM_FIELD`
- `CSRF_HEADER`
- `CsrfError`
- `FLASH_KEY`
- `FlashError`
- `MAX_FLASH_COUNT`
- `MAX_FLASH_MESSAGE_LENGTH`
- `SESSION`
- `SecurityHeaderError`
- `SessionError`
- `addFlash`
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
- `issueCsrfToken`
- `peekFlash`
- `securityHeaders`
- `sessionMiddleware`
- `verifyCsrfToken`
- `verifyOrigin`

## Type exports (15)

- `CsrfFailureReason`
- `CsrfMiddlewareOptions`
- `CsrfSecret`
- `CsrfVerdict`
- `FlashRecord`
- `FlashSeverity`
- `IssuedCsrfToken`
- `NonceContext`
- `OriginVerdict`
- `SecurityHeaderPolicy`
- `SessionData`
- `SessionHandle`
- `SessionMiddlewareOptions`
- `SessionStore`
- `TokenStore`
