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
