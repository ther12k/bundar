# @bundar/security

Bundar security primitives (GH-061, ADR-0017).

- Purpose: explicit, testable CSRF protection for state-changing
  cookie-authenticated requests — synchronizer tokens bound to the session
  cookie via HMAC-SHA-256, constant-time verification, expiry and rotation,
  optional single-use replay protection, and Origin/`Sec-Fetch-Site`
  verification with a documented fail-closed fallback.
- Threat model: cross-site request forgery against cookie-authenticated
  unsafe methods. Not a defense against XSS (tokens do not replace output
  escaping or CSP).
- Boundaries: imports `@bundar/core` public surface only (ADR-0017); nothing
  imports this package except applications and tests.
- Runtime dependencies: `@bundar/core` (workspace) only.

## Sessions (GH-062)

`sessionMiddleware({ store })` attaches a per-request session through the
narrow `SessionStore` interface (load/commit/destroy — no database coupling).
Cookies carry only an opaque 256-bit id with secure defaults
(`HttpOnly; SameSite=Lax; Path=/; Secure`; `Secure` is disabled explicitly
and only for local development). Unknown, expired, or malformed ids yield a
brand-new empty session; `session.rotate()` (call on login/privilege change)
issues a fresh id and destroys the old record; `session.destroy()` (logout)
invalidates the record and clears the cookie. `createMemorySessionStore()`
is for tests and single-process demos ONLY — production requires a durable
store with managed keys (see `docs/guides/sessions.md`). Signed/encrypted
cookie payloads were reviewed and deemed unnecessary: all state lives behind
the store.

